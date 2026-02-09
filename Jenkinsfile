ls
pipeline {

  agent any
  environment {
    NODE_ENV = 'production'
    AWS_REGION = 'us-east-1'
    ECR_SNAPSHOT = '147997138755.dkr.ecr.us-east-1.amazonaws.com/snapshot/patientservice'
    ECR_RELEASE = '147997138755.dkr.ecr.us-east-1.amazonaws.com/patientservice'
    IMAGE_NAME = 'patientservice'
  }
  stages {
    stage('Checkout') { steps { checkout scm } }
    stage('Build') {
      steps {
        script {
          if (fileExists('package-lock.json')) {
            sh 'npm ci'
          } else {
            sh 'npm install'
          }
        }
        sh 'npm run build'
      }
    }
    stage('Lint') {
      steps {
        sh 'npm run lint'
      }
    }
    stage('Test') {
      steps {
        sh 'npm test -- --coverage'
      }
    }
    stage('DockerBuild Snapshot') {
      steps {
        script {
          dockerImage = docker.build("${ECR_SNAPSHOT}:${env.BUILD_NUMBER}")
        }
      }
    }
    stage('Aqua Trivy Scan') {
      steps {
        sh 'trivy image --exit-code 1 --severity HIGH,CRITICAL ${ECR_SNAPSHOT}:${env.BUILD_NUMBER} || true'
      }
    }
    stage('Snapshot to Release') {
      steps {
        script {
          sh "docker tag ${ECR_SNAPSHOT}:${env.BUILD_NUMBER} ${ECR_RELEASE}:release"
          withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'aws-ecr-jenkins']]) {
            sh "aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin 147997138755.dkr.ecr.us-east-1.amazonaws.com"
            sh "docker push ${ECR_RELEASE}:release"
          }
        }
      }
    }
  }
  post {
    always { cleanWs() }
  }
}
