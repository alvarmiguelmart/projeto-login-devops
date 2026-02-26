terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "auth-system-vpc-${var.environment}"
  cidr = "10.0.0.0/16"

  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = var.environment == "prod" ? false : true
  enable_vpn_gateway = false
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Environment = var.environment
    Project     = "auth-system"
    ManagedBy   = "Terraform"
  }
}

# EKS Cluster
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = "auth-system-${var.environment}"
  cluster_version = "1.28"

  cluster_endpoint_public_access = true

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  eks_managed_node_group_defaults = {
    ami_type = "AL2_x86_64"
  }

  eks_managed_node_groups = {
    main = {
      name = "main-node-group"
      
      instance_types = ["t3.medium"]
      
      min_size     = 3
      max_size     = var.environment == "prod" ? 10 : 5
      desired_size = 3
    }
  }

  tags = {
    Environment = var.environment
    Project     = "auth-system"
  }
}

# RDS DocumentDB (MongoDB Compatible)
resource "aws_docdb_cluster" "mongodb" {
  cluster_identifier      = "auth-system-mongodb-${var.environment}"
  engine                  = "docdb"
  engine_version          = "5.0.0"
  master_username         = var.db_username
  master_password         = var.db_password
  backup_retention_period = 7
  preferred_backup_window = "07:00-09:00"
  skip_final_snapshot     = var.environment == "prod" ? false : true
  final_snapshot_identifier = "auth-system-mongodb-${var.environment}-final"
  vpc_security_group_ids  = [aws_security_group.mongodb.id]
  db_subnet_group_name    = aws_docdb_subnet_group.main.name
  
  tags = {
    Environment = var.environment
    Project     = "auth-system"
  }
}

resource "aws_docdb_subnet_group" "main" {
  name       = "auth-system-docdb-${var.environment}"
  subnet_ids = module.vpc.private_subnets
}

resource "aws_docdb_cluster_instance" "mongodb_instances" {
  count              = var.environment == "prod" ? 3 : 1
  identifier         = "auth-system-mongodb-${var.environment}-${count.index}"
  cluster_identifier = aws_docdb_cluster.mongodb.id
  instance_class     = "db.t3.medium"
  
  tags = {
    Environment = var.environment
    Project     = "auth-system"
  }
}

# ElastiCache Redis
resource "aws_elasticache_subnet_group" "redis" {
  name       = "auth-system-redis-${var.environment}"
  subnet_ids = module.vpc.private_subnets
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id          = "auth-system-redis-${var.environment}"
  description                   = "Redis cluster for Auth System"
  node_type                     = "cache.t3.micro"
  port                          = 6379
  parameter_group_name          = "default.redis7.cluster.on"
  automatic_failover_enabled    = var.environment == "prod" ? true : false
  subnet_group_name             = aws_elasticache_subnet_group.redis.name
  security_group_ids            = [aws_security_group.redis.id]
  
  num_node_groups         = 1
  replicas_per_node_group = var.environment == "prod" ? 2 : 0

  tags = {
    Environment = var.environment
    Project     = "auth-system"
  }
}

# Security Groups
resource "aws_security_group" "mongodb" {
  name        = "auth-system-mongodb-${var.environment}"
  description = "Security group for MongoDB"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description = "MongoDB from EKS"
    from_port   = 27017
    to_port     = 27017
    protocol    = "tcp"
    cidr_blocks = module.vpc.private_subnets_cidr_blocks
  }

  tags = {
    Environment = var.environment
    Project     = "auth-system"
  }
}

resource "aws_security_group" "redis" {
  name        = "auth-system-redis-${var.environment}"
  description = "Security group for Redis"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description = "Redis from EKS"
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = module.vpc.private_subnets_cidr_blocks
  }

  tags = {
    Environment = var.environment
    Project     = "auth-system"
  }
}
