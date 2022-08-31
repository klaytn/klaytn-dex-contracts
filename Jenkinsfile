@Library('jenkins-library@feature/PSS-1335/SlitherCI')

String agentLabel             = 'docker-build-agent'
String registry               = 'docker.soramitsu.co.jp'
String dockerBuildToolsUserId = 'bot-build-tools-ro'

String contractsPath          = '.'
String contractsEnvFile       = 'slither-env'
String solcVersion            = '0.8.14'
String nodeVersion            = '14.16.1'

pipeline {
    options {
        buildDiscarder(logRotator(numToKeepStr: '20'))
        timestamps()
        disableConcurrentBuilds()
    }
    agent {
        label agentLabel
    }
    stages {
        stage('Solidity Static Scanner') {
            steps {
                script {
                    docker.withRegistry('https://' + registry, dockerBuildToolsUserId) {
                        slither(contractsPath, contractsEnvFile, solcVersion, nodeVersion)
                    }
                }
            }
        }

    }
}
