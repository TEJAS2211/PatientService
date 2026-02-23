pipeline {
  agent any

  parameters {
    booleanParam(
      name: 'RUN_DB_TESTS',
      defaultValue: false,
      description: 'Reserved for future DB tests (DB not created yet)'
    )
  }

  options {
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '30', artifactNumToKeepStr: '30'))
    timeout(time: 45, unit: 'MINUTES')
  }

  environment {
    AWS_REGION   = 'us-east-1'
    SERVICE_NAME = 'patient'
    IMAGE_NAME   = 'patient'
    ECR_REPO     = '839690183795.dkr.ecr.us-east-1.amazonaws.com/patient'
    REPORT_DIR   = 'reports'
  }

  stages {

    stage('1. Checkout') {
      steps {
        checkout scm
      }
    }

    stage('2. Install Dependencies') {
      steps {
        sh '''
          echo "Installing dependencies..."
          rm -rf node_modules
          export NODE_ENV=development
          npm install
        '''
      }
    }

    stage('3. Quality Checks') {
      parallel {
        stage('Lint') {
          steps {
            sh '''
              if npm run | grep -q lint; then
                npm run lint
              else
                echo "No lint script found, skipping lint"
              fi
            '''
          }
        }
        stage('Unit Tests') {
          steps {
            sh '''
              if npm run | grep -q test; then
                npm test -- --coverage
              else
                echo "No test script found, skipping tests"
              fi
            '''
          }
        }
      }
    }

    stage('4. SonarQube Scan') {
      steps {
        withCredentials([string(credentialsId: 'SONAR_TOKEN_PATIENT', variable: 'SONAR_TOKEN')]) {
          sh '''
            echo "Running SonarQube scan..."
            export PATH=$PATH:/opt/sonar-scanner/bin
            sonar-scanner \
              -Dsonar.projectKey=patient \
              -Dsonar.projectName=patient \
              -Dsonar.sources=. \
              -Dsonar.host.url=http://100.50.131.6:9000 \
              -Dsonar.login=$SONAR_TOKEN
          '''
        }
      }
    }

    stage('5. Build Docker Image') {
      steps {
        sh '''
          echo "Building Docker image..."
          docker build -t ${IMAGE_NAME}:ci .
        '''
      }
    }

    stage('6. Trivy Security Scan') {
      steps {
        sh '''
          echo "Running Trivy scan..."
          mkdir -p ${REPORT_DIR}
          trivy image --format json --output ${REPORT_DIR}/trivy-image.json ${IMAGE_NAME}:ci
          trivy image --severity HIGH,CRITICAL --exit-code 1 ${IMAGE_NAME}:ci
        '''
      }
    }

    stage('7. Authenticate to AWS ECR') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'aws-creds',
          usernameVariable: 'AWS_ACCESS_KEY_ID',
          passwordVariable: 'AWS_SECRET_ACCESS_KEY'
        )]) {
          sh '''
            echo "Logging into AWS ECR..."
            aws ecr get-login-password --region ${AWS_REGION} \
            | docker login --username AWS --password-stdin 839690183795.dkr.ecr.us-east-1.amazonaws.com
          '''
        }
      }
    }

    stage('8. Tag Docker Image') {
      steps {
        sh '''
          docker tag ${IMAGE_NAME}:ci ${ECR_REPO}:${BUILD_NUMBER}
          docker tag ${IMAGE_NAME}:ci ${ECR_REPO}:latest
        '''
      }
    }

    stage('9. Push Image to ECR') {
      steps {
        sh '''
          docker push ${ECR_REPO}:${BUILD_NUMBER}
          docker push ${ECR_REPO}:latest
        '''
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'reports/**/*', allowEmptyArchive: true, fingerprint: true
      sh 'docker image rm -f ${IMAGE_NAME}:ci ${ECR_REPO}:${BUILD_NUMBER} ${ECR_REPO}:latest || true'
      cleanWs()
    }
  }
}
