terraform {
  required_version = ">= 1.8.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

variable "allowed_cidr" {
  description = "IP autorizado a acessar a API"
  type        = string
}

resource "aws_vpc" "academy" {
  cidr_block           = "10.42.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "academy-preview-vpc"
  }
}

resource "aws_subnet" "public" {
  vpc_id            = aws_vpc.academy.id
  cidr_block        = "10.42.1.0/24"
  availability_zone = "us-east-1a"

  tags = {
    Name = "academy-preview-public"
  }
}

resource "aws_internet_gateway" "academy" {
  vpc_id = aws_vpc.academy.id

  tags = {
    Name = "academy-preview-igw"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.academy.id
}

resource "aws_route" "internet" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.academy.id
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_security_group" "api" {
  name        = "academy-preview-api-sg"
  description = "Security group for Academy preview API"
  vpc_id      = aws_vpc.academy.id
}

resource "aws_vpc_security_group_ingress_rule" "http" {
  security_group_id = aws_security_group.api.id
  cidr_ipv4         = var.allowed_cidr
  from_port         = 3000
  to_port           = 3000
  ip_protocol       = "tcp"
}

resource "aws_vpc_security_group_egress_rule" "all" {
  security_group_id = aws_security_group.api.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}
