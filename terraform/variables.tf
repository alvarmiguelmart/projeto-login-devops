variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "auth-system.com"
}

variable "db_username" {
  description = "MongoDB master username"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "MongoDB master password"
  type        = string
  sensitive   = true
}
