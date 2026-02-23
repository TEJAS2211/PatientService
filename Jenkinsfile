pipeline {
    agent any

    environment {
        IMAGE_NAME = "patient"
        AWS_REGION = "us-east-1"
        ECR_REPO = "839690183795.dkr.ecr.us-east-1.amazonaws.com/patient"
        CONTAINER_NAME = "patient"
    }

    options {
        timestamps()
        timeout(time: 45, unit: 'MINUTES')
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
                          echo "No lint script found, skipping..."
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
                          echo "No test script found, skipping..."
                        fi
                        '''
                    }
                }
            }
        }

        stage('4. SonarQube Scan') {
            steps {
                withSonarQubeEnv('sonarqube') {
                    sh '''
                    echo "Running SonarQube scan via Docker..."

                    docker run --rm \
                      -e SONAR_HOST_URL=$SONAR_HOST_URL \
                      -e SONAR_LOGIN=$SONAR_AUTH_TOKEN \
                      -v $(pwd):/usr/src \
                      sonarsource/sonar-scanner-cli \
                      -Dsonar.projectKey=patient \
                      -Dsonar.projectName=patient \
                      -Dsonar.sources=src \
                      -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info
                    '''
                }
            }
        }

        stage('5. Build Docker Image') {
            steps {
                sh '''
                echo "Building Docker image..."
                docker build -t $IMAGE_NAME:ci .
                '''
            }
        }

        stage('6. Trivy Security Scan') {
            steps {
                sh '''
                echo "Running Trivy scan..."
                trivy image --exit-code 0 --severity HIGH,CRITICAL $IMAGE_NAME:ci
                '''
            }
        }

        stage('7. Authenticate to AWS ECR') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-creds'
                ]]) {
                    sh '''
                    echo "Logging into AWS ECR..."
                    aws ecr get-login-password --region $AWS_REGION | \
                    docker login --username AWS --password-stdin $ECR_REPO
                    '''
                }
            }
        }

        stage('8. Tag Docker Image') {
            steps {
                sh '''
                echo "Tagging Docker image..."
                docker tag $IMAGE_NAME:ci $ECR_REPO:latest
                docker tag $IMAGE_NAME:ci $ECR_REPO:${BUILD_NUMBER}
                '''
            }
        }

        stage('9. Push Image to ECR') {
            steps {
                sh '''
                echo "Pushing image to ECR..."
                docker push $ECR_REPO:latest
                docker push $ECR_REPO:${BUILD_NUMBER}
                '''
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: '**/coverage/**', allowEmptyArchive: true
            sh '''
            docker image rm -f $IMAGE_NAME:ci || true
            '''
            cleanWs()
        }
        success {
            echo "Pipeline completed successfully 🚀"
        }
        failure {
            echo "Pipeline failed ❌"
        }
    }
}
