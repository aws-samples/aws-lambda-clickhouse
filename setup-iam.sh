#!/bin/bash

# ClickHouse Lambda IAM Policy Setup Script
# This script creates and attaches IAM policies for ClickHouse Lambda access

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    print_error "jq is not installed. Please install it first."
    exit 1
fi

# Get current AWS account ID and region
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=$(aws configure get region)

if [ -z "$ACCOUNT_ID" ] || [ -z "$REGION" ]; then
    print_error "Failed to get AWS account ID or region. Please check your AWS configuration."
    exit 1
fi

print_status "AWS Account ID: $ACCOUNT_ID"
print_status "AWS Region: $REGION"

# Function to create IAM policy
create_policy() {
    local policy_name=$1
    local policy_file=$2
    
    print_status "Creating IAM policy: $policy_name"
    
    # Check if policy already exists
    if aws iam get-policy --policy-arn "arn:aws:iam::$ACCOUNT_ID:policy/$policy_name" &> /dev/null; then
        print_warning "Policy $policy_name already exists. Skipping creation."
        return 0
    fi
    
    # Create the policy
    aws iam create-policy \
        --policy-name "$policy_name" \
        --policy-document "file://$policy_file" \
        --description "Policy for ClickHouse Lambda access"
    
    print_status "Policy $policy_name created successfully"
}

# Function to attach policy to user
attach_policy_to_user() {
    local policy_name=$1
    local username=$2
    
    print_status "Attaching policy $policy_name to user $username"
    
    # Check if user exists
    if ! aws iam get-user --user-name "$username" &> /dev/null; then
        print_error "User $username does not exist. Please create the user first."
        return 1
    fi
    
    # Attach the policy
    aws iam attach-user-policy \
        --user-name "$username" \
        --policy-arn "arn:aws:iam::$ACCOUNT_ID:policy/$policy_name"
    
    print_status "Policy attached to user $username successfully"
}

# Function to create IAM user
create_user() {
    local username=$1
    
    print_status "Creating IAM user: $username"
    
    # Check if user already exists
    if aws iam get-user --user-name "$username" &> /dev/null; then
        print_warning "User $username already exists. Skipping creation."
        return 0
    fi
    
    # Create the user
    aws iam create-user --user-name "$username"
    
    # Create access key
    print_status "Creating access key for user $username"
    ACCESS_KEY_OUTPUT=$(aws iam create-access-key --user-name "$username")
    
    ACCESS_KEY_ID=$(echo "$ACCESS_KEY_OUTPUT" | jq -r '.AccessKey.AccessKeyId')
    SECRET_ACCESS_KEY=$(echo "$ACCESS_KEY_OUTPUT" | jq -r '.AccessKey.SecretAccessKey')
    
    print_status "Access key created for user $username"
    print_warning "IMPORTANT: Save these credentials securely!"
    echo "Access Key ID: $ACCESS_KEY_ID"
    echo "Secret Access Key: $SECRET_ACCESS_KEY"
    echo ""
    
    return 0
}

# Main execution
main() {
    echo "=========================================="
    echo "ClickHouse Lambda IAM Policy Setup"
    echo "=========================================="
    echo ""
    
    # Check if policy files exist
    if [ ! -f "iam-policy.json" ]; then
        print_error "iam-policy.json not found in current directory"
        exit 1
    fi
    
    # Create basic policy
    create_policy "ClickHouseLambdaQueryPolicy" "iam-policy.json"
    
    # Create comprehensive policy if file exists
    if [ -f "iam-policy-comprehensive.json" ]; then
        create_policy "ClickHouseLambdaComprehensivePolicy" "iam-policy-comprehensive.json"
    fi
    
    echo ""
    print_status "Policies created successfully!"
    echo ""
    
    # Ask if user wants to create a new IAM user
    read -p "Do you want to create a new IAM user for ClickHouse Lambda access? (y/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter username for the new IAM user: " USERNAME
        
        if [ -z "$USERNAME" ]; then
            print_error "Username cannot be empty"
            exit 1
        fi
        
        create_user "$USERNAME"
        
        # Ask which policy to attach
        echo ""
        echo "Which policy would you like to attach to the user?"
        echo "1. Basic policy (Lambda access only)"
        echo "2. Comprehensive policy (Lambda + S3 access)"
        read -p "Enter choice (1 or 2): " -n 1 -r
        echo ""
        
        if [[ $REPLY == "1" ]]; then
            attach_policy_to_user "ClickHouseLambdaQueryPolicy" "$USERNAME"
        elif [[ $REPLY == "2" ]]; then
            attach_policy_to_user "ClickHouseLambdaComprehensivePolicy" "$USERNAME"
        else
            print_error "Invalid choice"
            exit 1
        fi
        
        echo ""
        print_status "Setup completed successfully!"
        echo ""
        print_status "You can now use the following credentials to query ClickHouse Lambda:"
        echo "Access Key ID: $ACCESS_KEY_ID"
        echo "Secret Access Key: $SECRET_ACCESS_KEY"
        echo ""
        print_status "Test your setup with:"
        echo "curl 'https://YOUR_LAMBDA_URL/test.csv' \\"
        echo "  --aws-sigv4 \"aws:amz:$REGION:lambda\" \\"
        echo "  -u '$ACCESS_KEY_ID:$SECRET_ACCESS_KEY' \\"
        echo "  -d 'SELECT count(*) FROM table;'"
    else
        echo ""
        print_status "To attach policies to existing users, use:"
        echo "aws iam attach-user-policy --user-name USERNAME --policy-arn arn:aws:iam::$ACCOUNT_ID:policy/ClickHouseLambdaQueryPolicy"
    fi
}

# Run main function
main "$@"
