plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.ksp)
    alias(libs.plugins.hilt)
    alias(libs.plugins.paparazzi)
    alias(libs.plugins.kover)
}

// Apply the google-services plugin only when `app/google-services.json`
// exists. Lets devs build dev/prod variants without provisioning Firebase.
// Drop the file in place (1Password vault `<vault>`, item `<item>`) and
// the next build picks it up — no manifest or gradle edits required.
val googleServicesJson = file("google-services.json")
if (googleServicesJson.exists()) {
    apply(plugin = libs.plugins.google.services.get().pluginId)
}

android {
    namespace = "dev.ishflow.android"
    compileSdk = 35

    defaultConfig {
        applicationId = "dev.ishflow.android"
        minSdk = 34
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"
        testInstrumentationRunner = "dev.ishflow.android.HiltTestRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
            // Release signing reads keystore + creds from env vars so secrets
            // never enter the repo. 1Password vault `<vault>`, item
            // `<item>` holds the canonical values.
            // Set ISHFLOW_KEYSTORE_PATH / ISHFLOW_KEYSTORE_PASSWORD /
            // ISHFLOW_KEY_ALIAS / ISHFLOW_KEY_PASSWORD before running
            // `:app:assembleProdRelease`; when any are missing the build
            // falls back to the debug signing config so dev installs still
            // work.
            val keystorePath = System.getenv("ISHFLOW_KEYSTORE_PATH")
            val storePassword = System.getenv("ISHFLOW_KEYSTORE_PASSWORD")
            val keyAlias = System.getenv("ISHFLOW_KEY_ALIAS")
            val keyPassword = System.getenv("ISHFLOW_KEY_PASSWORD")
            if (
                !keystorePath.isNullOrBlank() &&
                !storePassword.isNullOrBlank() &&
                !keyAlias.isNullOrBlank() &&
                !keyPassword.isNullOrBlank() &&
                file(keystorePath).exists()
            ) {
                signingConfig = signingConfigs.create("release") {
                    storeFile = file(keystorePath)
                    this.storePassword = storePassword
                    this.keyAlias = keyAlias
                    this.keyPassword = keyPassword
                }
            }
        }
    }

    flavorDimensions += "env"
    productFlavors {
        create("dev") {
            dimension = "env"
            applicationIdSuffix = ".dev"
            versionNameSuffix = "-dev"
            buildConfigField("String", "API_BASE_URL", "\"http://10.0.2.2:3100\"")
            buildConfigField("Boolean", "ALLOW_DEV_SKIP", "true")
        }
        create("staging") {
            dimension = "env"
            applicationIdSuffix = ".staging"
            versionNameSuffix = "-staging"
            buildConfigField("String", "API_BASE_URL", "\"https://ishflow.com\"")
            buildConfigField("Boolean", "ALLOW_DEV_SKIP", "false")
        }
        create("prod") {
            dimension = "env"
            buildConfigField("String", "API_BASE_URL", "\"https://ishflow.com\"")
            buildConfigField("Boolean", "ALLOW_DEV_SKIP", "false")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
        isCoreLibraryDesugaringEnabled = true
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.navigation.compose)

    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.compose.material3)
    implementation(libs.compose.material.icons.extended)
    debugImplementation(libs.compose.ui.tooling)

    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)
    implementation(libs.hilt.navigation.compose)

    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.kotlinx.serialization.json)

    // Vico — Compose-native chart library. M3 variant pulls in
    // Material 3 token wiring so charts pick up the active color scheme
    // (primary / surface / onSurface) without per-call configuration.
    implementation("com.patrykandpatrick.vico:compose-m3:2.0.0")

    implementation(project(":apiclient"))
    implementation(libs.okhttp)
    implementation(project(":auth"))
    implementation(project(":core"))
    implementation(project(":appshared"))
    implementation(project(":feature-sales"))
    implementation(project(":feature-prices"))
    implementation(project(":feature-inventory"))
    implementation(project(":feature-settings"))
    implementation(project(":feature-docs"))
    implementation(project(":feature-cari"))
    implementation(project(":feature-purchases"))

    coreLibraryDesugaring(libs.desugar)

    debugImplementation("com.squareup.leakcanary:leakcanary-android:2.14")

    androidTestImplementation(libs.compose.ui.test.junit4)
    androidTestImplementation(libs.androidx.test.runner)
    androidTestImplementation(libs.androidx.test.ext.junit)
    androidTestImplementation(libs.androidx.test.espresso.core)
    androidTestImplementation(libs.hilt.android.testing)
    kspAndroidTest(libs.hilt.compiler)

    testImplementation(libs.junit5)
    testRuntimeOnly(libs.junit5.engine)
    testRuntimeOnly("org.junit.vintage:junit-vintage-engine:5.11.3")
    testImplementation(libs.kotlin.test)
    testImplementation(libs.kotlinx.coroutines.test)
    testImplementation(libs.mockk)
}

tasks.withType<Test> {
    useJUnitPlatform()
}
