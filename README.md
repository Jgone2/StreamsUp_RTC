# 📌 be\_rtc - 실시간 스트리밍 및 채팅 플랫폼

## 📖 프로젝트 개요

**be\_rtc**는 NestJS 기반으로 WebRTC 및 Socket.IO를 활용한 실시간 스트리밍과 채팅 기능을 제공하는 플랫폼입니다. Docker 컨테이너 환경에서 마이크로서비스 구조로 설계되어 있으며, MySQL 및 Redis를 통해 데이터 관리 및 캐싱을 효율적으로 수행합니다.

## 🎯 주요 목표

* **실시간 통신**: WebRTC와 Socket.IO를 활용한 실시간 스트리밍과 채팅
* **확장성 및 관리 용이성**: Docker 컨테이너 환경 구성
* **보안성 강화**: JWT 기반 사용자 인증 및 관리
* **성능 최적화**: Redis를 활용한 데이터 캐싱 및 세션 관리

## 🏗️ 시스템 아키텍처

```
사용자 → NestJS Gateway → WebRTC (P2P) 및 Socket.IO → MySQL & Redis
```

## 🔧 기술 스택

### Backend

* NestJS (Node.js)
* TypeScript
* WebRTC, Socket.IO
* MySQL, Redis

### Infrastructure

* Docker, Docker Compose

### Development

* ESLint, Prettier
* Yarn, TypeScript

## ✨ 주요 기능

### 🎥 실시간 스트리밍

* WebRTC 기반 P2P 영상 스트리밍
* Socket.IO 기반 실시간 데이터 통신

### 💬 실시간 채팅

* 메시지 전송 및 실시간 채팅방 관리

### 🔑 사용자 인증

* JWT 기반 인증 및 권한 관리
* 미들웨어를 활용한 보안 처리

## 🚀 실행 방법

### 환경 변수 설정

`.env` 파일을 설정:

```bash
# .env 예시 설정
DB_HOST=mysql
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_DATABASE=rtc_db
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=your_jwt_secret
```

### 서비스 실행

```bash
git clone <repository-url>
cd be_rtc
docker-compose up -d
docker-compose logs -f
```

### 개발 모드 실행

```bash
yarn install
yarn start:dev
```

## 🗂️ 프로젝트 구조

```
be_rtc/
├── src/
│   ├── common/
│   ├── modules/
│   │   ├── streams/
│   │   ├── auth/
│   │   └── chat/
│   └── main.ts
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── .env
```

## 🔧 개발 가이드

* 코드 품질 유지 (ESLint, Prettier 사용)
* Docker 기반의 로컬 개발 환경 구성 및 관리 방법

## 🔒 보안 가이드

* JWT 기반 사용자 인증
* 환경변수 민감 정보 관리

## 🚨 트러블슈팅

자주 발생하는 Docker 컨테이너 및 데이터베이스 관련 문제 해결 방법 제공

## 🤝 기여 가이드

* Git 커밋 컨벤션 준수
* 코드 리뷰 및 Pull Request 절차 명시

---

**be\_rtc** - 실시간 스트리밍 및 채팅 플랫폼 ✨
