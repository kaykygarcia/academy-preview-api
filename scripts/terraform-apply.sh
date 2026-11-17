#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INFRA="$ROOT/infra"

export AWS_PROFILE="${AWS_PROFILE:-academy}"
export AWS_REGION=us-east-1
export AWS_DEFAULT_REGION="$AWS_REGION"

echo "=== Kayky Academy | Terraform ==="
for cmd in terraform aws curl; do
  command -v "$cmd" >/dev/null || { echo "Comando não encontrado: $cmd"; exit 1; }
done

if [[ ! -f "$INFRA/terraform.tfstate" ]]; then
  echo "Terraform State local não encontrado em $INFRA"
  echo "Operação interrompida para evitar provisionamento duplicado."
  exit 1
fi

aws sts get-caller-identity >/dev/null
DETECTED_IP=$(curl -4 -fsS --max-time 10 https://checkip.amazonaws.com | tr -d '[:space:]')
echo
echo "IP público detectado: $DETECTED_IP"
read -rp "IP a autorizar [$DETECTED_IP]: " CUSTOM_IP
IP="${CUSTOM_IP:-$DETECTED_IP}"

if [[ ! "$IP" =~ ^([0-9]{1,3}[.]){3}[0-9]{1,3}$ ]]; then
  echo "Endereço IPv4 inválido."
  exit 1
fi
IFS='.' read -r a b c d <<< "$IP"
for octet in "$a" "$b" "$c" "$d"; do
  if (( 10#$octet > 255 )); then
    echo "Endereço IPv4 inválido."
    exit 1
  fi
done

export TF_VAR_allowed_cidr="$IP/32"
echo
echo "CIDR selecionado: $TF_VAR_allowed_cidr"
read -rp "Gerar plano Terraform? [s/N]: " CONFIRM
[[ "$CONFIRM" =~ ^[sS]$ ]] || exit 0

PLAN=$(mktemp "$INFRA/.academy-XXXXXX.tfplan")
trap 'rm -f "$PLAN"' EXIT
terraform -chdir="$INFRA" init -input=false
terraform -chdir="$INFRA" plan -input=false -out="$PLAN"

echo
echo "=== Plano gerado ==="
echo "Revise as mudanças acima antes de continuar."
read -rp "Aplicar este plano na AWS? [s/N]: " APPLY
if [[ "$APPLY" =~ ^[sS]$ ]]; then
  terraform -chdir="$INFRA" apply -input=false "$PLAN"
  echo "Terraform apply concluído."
else
  echo "Nenhuma alteração aplicada."
fi
