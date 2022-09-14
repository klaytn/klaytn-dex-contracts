@Library('jenkins-library@feature/SNE-239/Mythril')

String agentLabel             = 'docker-build-agent'
String registry               = 'docker.soramitsu.co.jp'
String dockerBuildToolsUserId = 'bot-build-tools-ro'

String contractsPath          = '.'
String contractsEnvFile       = 'slither-env'
String solcVersion            = '0.8.14'
String nodeVersion            = '14.16.1'

String mythrilTimeoutSecs     = 15
String mythrilExcludeFiles    = 'mocks,interfaces,artifacts'

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
        stage('Solidity Security Scanning'){
                    parallel{
                        stage('Mythril') {
                            steps {
                                script {
                                    docker.withRegistry('https://' + registry, dockerBuildToolsUserId) {
                                        mythril(contractsPath, nodeVersion, mythrilTimeoutSecs, mythrilExcludeFiles)
                                    }
                                }
                            }
                        }
                        stage('Slither') {
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

    }
}
