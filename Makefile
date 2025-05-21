.PHONY: build test clean fclean docker-build docker-network docker-up docker-down run re \
        prisma-migrate prisma-generate prisma-reset

# ---------- 기본 작업 ----------
build:
	yarn install --force

test:
	yarn test

clean:
	rm -rf node_modules dist

# ---------- Prisma ----------
# ❶ 로컬에서 Prisma Client 생성(테이블 변경 후 항상 먼저 실행)
prisma-generate:
	npx prisma generate

# ❷ 로컬 DB 마이그레이션 (dev 전용)
prisma-migrate:
	npx prisma migrate dev --name init

# (선택) DB, 마이그레이션 모두 리셋
prisma-reset:
	npx prisma migrate reset

# ---------- Docker ----------
docker-build: prisma-generate
	docker build --no-cache --build-arg NODE_ENV=dev -t ssafricatv-app .

docker-network:
	docker network create socket-network || true

docker-up: docker-network docker-build
	docker-compose --env-file .dev.env up -d

docker-down:
	docker-compose down -v

docker-clean-image:
	docker rmi -f ssafricatv-app || true

fclean: clean docker-down docker-clean-image
	docker rmi -f ssafricatv-app || true
	docker network rm socket-network || true

# 전체 재시작
re: fclean docker-up

# ---------- 로컬 Nest 실행 ----------
run: prisma-generate
	yarn start:dev
