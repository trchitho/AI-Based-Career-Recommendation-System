## ☸️ `infra/k8s/README.md`

````markdown
# ☸️ Kubernetes Deployment (Placeholder)

## 1. Mục đích

Thư mục này chứa manifest mẫu để triển khai dự án NCKH lên Kubernetes (sau MVP).

Hiện tại **chưa sử dụng trong giai đoạn MVP** — chỉ giữ làm reference.

---

## 2. Thành phần dự kiến

| File                         | Vai trò                               |
| ---------------------------- | ------------------------------------- |
| `backend-deployment.yaml`    | Deploy container FastAPI              |
| `backend-service.yaml`       | Expose BE qua ClusterIP hoặc NodePort |
| `frontend-deployment.yaml`   | Deploy container Next.js              |
| `frontend-service.yaml`      | Expose FE cho ingress/nginx           |
| `configmap.yaml` _(sẽ thêm)_ | ALLOWED_ORIGINS, AI_MODELS_DIR        |
| `secret.yaml` _(sẽ thêm)_    | DATABASE_URL, Neo4j credentials       |

---

## 3. Lệnh tham khảo

```bash
kubectl apply -f backend-deployment.yaml
kubectl apply -f backend-service.yaml
kubectl get pods -n nckh
```
````
