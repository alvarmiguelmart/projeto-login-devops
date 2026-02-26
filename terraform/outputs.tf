output "vpc_id" {
  description = "The ID of the VPC"
  value       = module.vpc.vpc_id
}

output "eks_cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_name" {
  description = "Kubernetes Cluster Name"
  value       = module.eks.cluster_name
}

output "docdb_endpoint" {
  description = "DocumentDB (MongoDB) Endpoint"
  value       = aws_docdb_cluster.mongodb.endpoint
}

output "redis_endpoint" {
  description = "ElastiCache (Redis) Endpoint"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}
