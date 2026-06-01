# 🚀 AWS Integration Setup Guide

Hướng dẫn chi tiết để tích hợp ứng dụng với AWS Cognito, API Gateway, Lambda, và DynamoDB.

---

## 📋 Các Thành Phần AWS Cần Thiết

### 1. **AWS Cognito** - Xác Thực Người Dùng
- User Pool để quản lý tài khoản
- App Client để tích hợp vào frontend

### 2. **API Gateway** - Backend API
- REST endpoints cho CRUD tasks
- Integrated với Lambda functions

### 3. **AWS Lambda** - Backend Logic
- `getTask` - Lấy danh sách tasks
- `createTask` - Tạo task mới
- `updateTask` - Cập nhật task
- `deleteTask` - Xóa task

### 4. **DynamoDB** - Database
- Table `Tasks` để lưu công việc
- Table `Users` để lưu thông tin người dùng (optional, Cognito sẽ quản lý)

---

## 🔧 Cấu Hình Bước 1: Cấu Hình AWS Cognito

### Tạo User Pool

```bash
# Dùng AWS Console hoặc AWS CLI
aws cognito-idp create-user-pool --pool-name TaskManagementUserPool --region ap-southeast-1
```

### Lấy thông tin cần thiết
- **User Pool ID** - Dùng để cấu hình frontend
- **Client ID** - App Client ID

### Cập nhật config.js

```javascript
// frontend/config.js
const AWS_CONFIG = {
    region: 'ap-southeast-1',
    cognito: {
        userPoolId: 'ap-southeast-1_XXXXXXXXX',  // ← Thay đổi
        clientId: 'XXXXXXXXXXXXXXXXXXX',          // ← Thay đổi
        redirectSignIn: 'http://localhost:8000/tasks.html',
        redirectSignOut: 'http://localhost:8000/auth.html'
    },
    api: {
        baseUrl: 'https://xxxxxxxxxx.execute-api.ap-southeast-1.amazonaws.com/prod'
    }
};
```

---

## 🌐 Cấu Hình Bước 2: API Gateway & Lambda

### Tạo REST API trên API Gateway

```bash
# Tạo API
aws apigateway create-rest-api --name TaskManagementAPI --region ap-southeast-1

# Lấy ID của root resource
aws apigateway get-resources --rest-api-id <api-id>

# Tạo resource /tasks
aws apigateway create-resource \
    --rest-api-id <api-id> \
    --parent-id <root-id> \
    --path-part tasks
```

### Lambda Functions

#### 1. **getTask** - Lấy danh sách tasks

```python
# lambda_functions/getTask.py
import json
import boto3
import os
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Tasks')

def lambda_handler(event, context):
    """
    Lấy danh sách tasks của user từ DynamoDB
    """
    try:
        # Lấy user ID từ Cognito
        user_id = event['requestContext']['authorizer']['claims']['sub']
        
        # Query tasks của user
        response = table.query(
            KeyConditionExpression='userId = :userId',
            ExpressionAttributeValues={
                ':userId': user_id
            }
        )
        
        # Convert Decimal to int/float
        tasks = json.loads(json.dumps(response['Items'], default=str))
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(tasks)
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': str(e)})
        }
```

#### 2. **createTask** - Tạo task mới

```python
# lambda_functions/createTask.py
import json
import boto3
import uuid
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Tasks')

def lambda_handler(event, context):
    """
    Tạo task mới cho user
    """
    try:
        # Lấy user ID từ Cognito
        user_id = event['requestContext']['authorizer']['claims']['sub']
        
        # Parse request body
        body = json.loads(event['body'])
        
        # Validate
        if not body.get('title') or not body.get('deadline'):
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Missing required fields'})
            }
        
        # Tạo task item
        task_id = str(uuid.uuid4())
        task = {
            'id': task_id,
            'userId': user_id,
            'title': body['title'],
            'description': body.get('description', ''),
            'deadline': body['deadline'],
            'priority': body.get('priority', 'medium'),
            'status': body.get('status', 'pending'),
            'createdAt': datetime.utcnow().isoformat(),
            'updatedAt': datetime.utcnow().isoformat()
        }
        
        # Save to DynamoDB
        table.put_item(Item=task)
        
        return {
            'statusCode': 201,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(task)
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
```

#### 3. **updateTask** - Cập nhật task

```python
# lambda_functions/updateTask.py
import json
import boto3
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Tasks')

def lambda_handler(event, context):
    """
    Cập nhật task của user
    """
    try:
        user_id = event['requestContext']['authorizer']['claims']['sub']
        task_id = event['pathParameters']['id']
        body = json.loads(event['body'])
        
        # Lấy task để kiểm tra ownership
        response = table.get_item(Key={'id': task_id, 'userId': user_id})
        
        if 'Item' not in response:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': 'Task not found'})
            }
        
        # Cập nhật
        update_expression = 'SET '
        expression_values = {':updated': datetime.utcnow().isoformat()}
        
        if 'title' in body:
            update_expression += 'title = :title, '
            expression_values[':title'] = body['title']
        
        if 'description' in body:
            update_expression += 'description = :description, '
            expression_values[':description'] = body['description']
        
        if 'deadline' in body:
            update_expression += 'deadline = :deadline, '
            expression_values[':deadline'] = body['deadline']
        
        if 'priority' in body:
            update_expression += 'priority = :priority, '
            expression_values[':priority'] = body['priority']
        
        if 'status' in body:
            update_expression += 'status = :status, '
            expression_values[':status'] = body['status']
        
        update_expression += 'updatedAt = :updated'
        
        table.update_item(
            Key={'id': task_id, 'userId': user_id},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_values
        )
        
        # Lấy item sau khi update
        response = table.get_item(Key={'id': task_id, 'userId': user_id})
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps(response['Item'], default=str)
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
```

#### 4. **deleteTask** - Xóa task

```python
# lambda_functions/deleteTask.py
import json
import boto3

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Tasks')

def lambda_handler(event, context):
    """
    Xóa task của user
    """
    try:
        user_id = event['requestContext']['authorizer']['claims']['sub']
        task_id = event['pathParameters']['id']
        
        # Kiểm tra ownership
        response = table.get_item(Key={'id': task_id, 'userId': user_id})
        
        if 'Item' not in response:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': 'Task not found'})
            }
        
        # Xóa
        table.delete_item(Key={'id': task_id, 'userId': user_id})
        
        return {
            'statusCode': 204,
            'headers': {'Content-Type': 'application/json'}
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
```

---

## 💾 Cấu Hình Bước 3: DynamoDB Tables

### Tạo Table `Tasks`

```bash
aws dynamodb create-table \
    --table-name Tasks \
    --attribute-definitions \
        AttributeName=id,AttributeType=S \
        AttributeName=userId,AttributeType=S \
        AttributeName=createdAt,AttributeType=S \
    --key-schema \
        AttributeName=id,KeyType=HASH \
        AttributeName=userId,KeyType=RANGE \
    --global-secondary-indexes \
        IndexName=userIdIndex,Keys=[{AttributeName=userId,KeyType=HASH},{AttributeName=createdAt,KeyType=RANGE}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5} \
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --region ap-southeast-1
```

**Cấu trúc dữ liệu:**
```json
{
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "ap-southeast-1:12345678-1234-1234-1234-123456789012",
    "title": "Hoàn thành project",
    "description": "Finish AWS integration",
    "deadline": "2024-06-01",
    "priority": "high",
    "status": "pending",
    "createdAt": "2024-05-31T10:00:00.000Z",
    "updatedAt": "2024-05-31T10:00:00.000Z"
}
```

---

## 🔐 API Gateway Authorization

### Cấu Hình Cognito Authorizer

```bash
# Tạo authorizer trên API Gateway
aws apigateway create-authorizer \
    --rest-api-id <api-id> \
    --name CognitoAuthorizer \
    --type COGNITO_USER_POOLS \
    --provider-arns arn:aws:cognito-idp:ap-southeast-1:<account-id>:userpool/ap-southeast-1_XXXXXXXXX \
    --identity-source method.request.header.Authorization
```

### Gán Authorizer vào Methods

```bash
# PUT authorizer trên GET /tasks
aws apigateway put-method \
    --rest-api-id <api-id> \
    --resource-id <tasks-resource-id> \
    --http-method GET \
    --authorization-type CUSTOM \
    --authorizer-id <authorizer-id>
```

---

## 🚀 Chạy Ứng Dụng

### 1. Cập nhật config.js
```javascript
const AWS_CONFIG = {
    region: 'ap-southeast-1',
    cognito: {
        userPoolId: 'ap-southeast-1_XXXXXXXXX',
        clientId: 'XXXXXXXXXXXXXXXXXXX',
        redirectSignIn: 'http://localhost:8000/auth.html',
        redirectSignOut: 'http://localhost:8000/auth.html'
    },
    api: {
        baseUrl: 'https://xxxxxxxxxx.execute-api.ap-southeast-1.amazonaws.com/prod'
    }
};
```

### 2. Chạy HTTP Server
```bash
cd frontend
python -m http.server 8000
```

### 3. Truy cập ứng dụng
```
http://localhost:8000/auth.html
```

---

## 📊 Flow Hoạt Động

```
1. User đăng nhập/đăng ký
   ↓ (Cognito Sign Up/Sign In)
   ↓
2. Nhận JWT Token từ Cognito
   ↓ (Token lưu vào localStorage)
   ↓
3. Mở trang Tasks
   ↓ (Gửi GET /tasks với Bearer token)
   ↓
4. Lambda getTask nhận request
   ↓ (Lấy userId từ token, query DynamoDB)
   ↓
5. DynamoDB trả về list tasks
   ↓
6. Hiển thị danh sách tasks
   ↓
7. User thực hiện CRUD operations
   ↓ (POST/PUT/DELETE /tasks)
   ↓
8. Lambda xử lý và update DynamoDB
```

---

## 🐛 Troubleshooting

### 1. Token hết hạn
- **Vấn đề**: Redirect về auth.html
- **Giải pháp**: Cognito sẽ tự refresh token, nếu không được thì user cần đăng nhập lại

### 2. CORS errors
- **Vấn đề**: Browser block request từ frontend
- **Giải pháp**: Thêm CORS headers vào API Gateway responses

```javascript
// Trong Lambda response
{
    'statusCode': 200,
    'headers': {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'http://localhost:8000',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    },
    'body': json.dumps(data)
}
```

### 3. DynamoDB Permission Denied
- **Vấn đề**: Lambda không thể truy cập DynamoDB
- **Giải pháp**: Gán IAM policy cho Lambda execution role

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:GetItem",
                "dynamodb:Query",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",
                "dynamodb:DeleteItem"
            ],
            "Resource": "arn:aws:dynamodb:ap-southeast-1:*:table/Tasks"
        }
    ]
}
```

---

## 📝 Environment Variables

Có thể sử dụng AWS Systems Manager Parameter Store để quản lý config:

```bash
# Lưu config vào Parameter Store
aws ssm put-parameter \
    --name /task-app/cognito/userPoolId \
    --value ap-southeast-1_XXXXXXXXX \
    --type String

# Lambda đọc config
import boto3
ssm = boto3.client('ssm')
user_pool_id = ssm.get_parameter(Name='/task-app/cognito/userPoolId')['Parameter']['Value']
```

---

## ✅ Kiểm Tra Setup Hoàn Toàn

- [ ] Cognito User Pool được tạo
- [ ] App Client được tạo trong User Pool
- [ ] API Gateway được tạo
- [ ] 4 Lambda functions được deploy
- [ ] DynamoDB Table `Tasks` được tạo
- [ ] IAM roles và policies được cấu hình
- [ ] CORS được enable trên API Gateway
- [ ] Cognito Authorizer được gán vào API methods
- [ ] config.js được cập nhật với đúng values
- [ ] Frontend chạy trên http://localhost:8000

---

**Happy Coding! 🎉**
