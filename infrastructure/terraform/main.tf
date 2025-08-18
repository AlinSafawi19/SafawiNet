terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket = "safawinet-terraform-state"
    key    = "infrastructure/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "safawinet"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# VPC and Networking
module "vpc" {
  source = "./modules/vpc"
  
  environment = var.environment
  vpc_cidr    = var.vpc_cidr
  azs         = var.availability_zones
}

# RDS Database
module "rds" {
  source = "./modules/rds"
  
  environment     = var.environment
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids
  security_groups = [module.vpc.database_security_group_id]
  
  db_name     = var.database_name
  db_username = var.database_username
  db_password = var.database_password
  
  instance_class = var.environment == "prod" ? "db.t3.medium" : "db.t3.micro"
  allocated_storage = var.environment == "prod" ? 100 : 20
}

# ElastiCache Redis
module "redis" {
  source = "./modules/redis"
  
  environment     = var.environment
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids
  security_groups = [module.vpc.redis_security_group_id]
  
  node_type = var.environment == "prod" ? "cache.t3.micro" : "cache.t3.micro"
  num_cache_nodes = var.environment == "prod" ? 1 : 1
}

# ECS Cluster and Services
module "ecs" {
  source = "./modules/ecs"
  
  environment = var.environment
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.public_subnet_ids
  
  app_name        = "safawinet-api"
  container_port  = 3000
  cpu             = var.environment == "prod" ? 1024 : 512
  memory          = var.environment == "prod" ? 2048 : 1024
  
  desired_count = var.environment == "prod" ? 2 : 1
  max_count     = var.environment == "prod" ? 4 : 2
  
  database_url = module.rds.connection_string
  redis_host   = module.redis.host
  redis_port   = module.redis.port
  redis_password = module.redis.password
}

# Application Load Balancer
module "alb" {
  source = "./modules/alb"
  
  environment = var.environment
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.public_subnet_ids
  
  domain_name = var.environment == "prod" ? "api.safawinet.com" : "api-stg.safawinet.com"
  
  target_group_arn = module.ecs.target_group_arn
}

# CloudWatch Alarms
module "monitoring" {
  source = "./modules/monitoring"
  
  environment = var.environment
  alb_arn     = module.alb.alb_arn
  ecs_service = module.ecs.service_name
  ecs_cluster = module.ecs.cluster_name
}

# Secrets Manager
module "secrets" {
  source = "./modules/secrets"
  
  environment = var.environment
  
  jwt_secret         = var.jwt_secret
  jwt_refresh_secret = var.jwt_refresh_secret
  encryption_key     = var.encryption_key
  
  database_password = var.database_password
  redis_password    = module.redis.password
}

# SES Configuration
module "ses" {
  source = "./modules/ses"
  
  environment = var.environment
  domain_name = var.environment == "prod" ? "safawinet.com" : "staging.safawinet.com"
}
