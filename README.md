# Raaya Backend

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodemon&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![AWS](https://img.shields.io/badge/AWS-FF9900?style=for-the-badge&logo=amazon-aws&logoColor=white)](https://aws.amazon.com/)
[![License: Unlicensed](https://img.shields.io/badge/License-Unlicensed-red.svg)](https://choosealicense.com/licenses/unlicense/)

A robust backend service built with NestJS for the Raaya health management platform. This MVP provides AI-powered insights, secure authentication, job scheduling, and notification services deployed on AWS.

## 🚀 Features

- **AI-Powered Insights**: Integrated with AWS Bedrock for intelligent health recommendations
- **Secure Authentication**: JWT-based auth with AWS Cognito integration
- **Role-Based Access Control**: Flexible user roles and permissions
- **Job Scheduling**: Automated medication reminders and daily digests
- **Real-time Notifications**: Push notifications for health events
- **Cloud-Native Deployment**: Optimized for AWS with Lambda functions and EC2

## 🛠️ Tech Stack

- **Framework**: [NestJS](https://nestjs.com/) - Progressive Node.js framework
- **Language**: TypeScript
- **Authentication**: AWS Cognito + Passport JWT
- **AI/ML**: AWS Bedrock Runtime
- **Database**: PostgreSQL (via AWS RDS)
- **Deployment**: AWS EC2, Lambda, S3
- **Monitoring**: AWS CloudWatch
- **CI/CD**: GitHub Actions

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- AWS CLI configured (for deployment)

## 🚀 Installation

1. Clone the repository:
```bash
git clone https://github.com/amrhanygomaa/raaya-backend.git
cd raaya-backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

## 🏃‍♂️ Running the Application

```bash
# Development mode
npm run start:dev

# Production build
npm run build
npm run start:prod

# Testing
npm run test
npm run test:e2e
```

## 📚 API Documentation

The API provides endpoints for:

- **Authentication** (`/auth`): User login, token validation, role claims
- **AI Insights** (`/ai`): Health recommendations and analysis
- **Jobs** (`/jobs`): Medication scheduling and reminders
- **Notifications** (`/notifications`): Push notification management

For detailed API specs, see the [API documentation](docs/api.md) (coming soon).

## 📁 Project Structure

```
src/
├── ai/              # AI insights module
├── auth/            # Authentication & authorization
├── jobs/            # Job scheduling
├── notifications/   # Notification services
└── ...

docs/                # Documentation
├── environment-and-secrets.md
├── deployment-checklist.md
├── aws-light-foundation.md
└── ...

lambda/              # AWS Lambda functions
├── lambda-daily-digest.js
├── lambda-medication-reminder.js
└── lambda-weekly-ai-summary.js
```

## 🚀 Deployment

This project is designed for AWS deployment. See our deployment guides:

- [AWS Foundation Checklist](docs/aws-foundation-checklist.md)
- [Deployment Checklist](docs/deployment-checklist.md)
- [Environment Setup](docs/environment-and-secrets.md)

For manual deployment from GitHub Actions, use the `deploy=true` workflow parameter.

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run e2e tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 Documentation

- [Environment and Secrets](docs/environment-and-secrets.md)
- [AWS Light Foundation](docs/aws-light-foundation.md)
- [Demo Script](docs/demo-script.md)
- [Monitoring Runbook](docs/monitoring-runbook.md)
- [S3 Media Bucket Setup](docs/s3-media-bucket.md)

## 📝 License

This project is unlicensed and proprietary.

## 👥 Authors

- **Amr Hany Gomaa** - *Initial work* - [amrhanygomaa](https://github.com/amrhanygomaa)

## 🙏 Acknowledgments

- NestJS team for the excellent framework
- AWS for cloud services
- All contributors and testers


- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
