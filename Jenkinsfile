@Library('jenkins-library@feature/SNE-239/Mythril')

String agentLabel             = 'docker-build-agent'
String registry               = 'docker.soramitsu.co.jp'
String dockerBuildToolsUserId = 'bot-build-tools-ro'

String contractsPath          = '.'
String contractsEnvFile       = 'slither-env'
String solcVersion            = '0.8.14'
String nodeVersion            = '14.16.1'

String mythrilTimeoutSecs       = 100
String mythrilWeeklyTimeoutSecs = 300
String mythrilExcludeFiles      = 'mocks,interfaces,artifacts,node_modules'

pipeline {
    options {
        buildDiscarder(logRotator(numToKeepStr: '20'))
        timestamps()
        disableConcurrentBuilds()
    }
    agent {
        label agentLabel
    }
    triggers {
        cron("@weekly")
    }
    stages {
        stage("Weekly Mythril"){
            when{
                triggeredBy 'TimerTrigger'
            }
            steps {
                script {
                    docker.withRegistry('https://' + registry, dockerBuildToolsUserId) {
                        mythril(contractsPath, nodeVersion, mythrilWeeklyTimeoutSecs, mythrilExcludeFiles)
                    }
                }
            }
        }
        stage('Mythril Solidity Security Scan') {
            when{
                not { triggeredBy 'TimerTrigger' }
            }
            steps {
                script {
                    docker.withRegistry('https://' + registry, dockerBuildToolsUserId) {
                        mythril(contractsPath, nodeVersion, mythrilTimeoutSecs, mythrilExcludeFiles)
                    }
                }
            }
        }
        stage('Slither Solidity Security Scan') {
            when{
                not {triggeredBy 'TimerTrigger'}
            }
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
