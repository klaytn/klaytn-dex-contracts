@Library('jenkins-library@feature/PSS-1335/SlitherCI')

String contractsPath          = 'ethereum-bridge-contracts'
String contractsEnvFile       = 'env.template'
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
