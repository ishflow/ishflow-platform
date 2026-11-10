pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\.android.*")
                includeGroupByRegex("com\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "ishflow"
include(":app")
include(":apiclient")
include(":auth")
include(":core")
include(":appshared")
include(":feature-sales")
include(":feature-prices")
include(":feature-inventory")
include(":feature-settings")
include(":feature-docs")
include(":feature-cari")
include(":feature-purchases")
