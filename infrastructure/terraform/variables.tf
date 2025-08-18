variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (staging, prod)"
  type        = string
  validation {
    condition     = contains(["staging", "prod"], var.environment)
    error_message = "Environment must be either 'staging' or 'prod'."
  }
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "database_name" {
  description = "Database name"
  type        = string
  default     = "safawinet"
}

variable "database_username" {
  description = "Database username"
  type        = string
  default     = "postgres"
}

variable "database_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT secret key"
  type        = string
  sensitive   = true
}

variable "jwt_refresh_secret" {
  description = "JWT refresh secret key"
  type        = string
  sensitive   = true
}

variable "encryption_key" {
  description = "Encryption key (32 characters)"
  type        = string
  sensitive   = true
  validation {
    condition     = length(var.encryption_key) == 32
    error_message = "Encryption key must be exactly 32 characters long."
  }
}

variable "sentry_dsn" {
  description = "Sentry DSN"
  type        = string
  default     = ""
}

variable "ses_access_key_id" {
  description = "SES access key ID"
  type        = string
  default     = ""
}

variable "ses_secret_access_key" {
  description = "SES secret access key"
  type        = string
  default     = ""
  sensitive   = true
}
