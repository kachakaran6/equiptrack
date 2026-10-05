import java.io.FileInputStream
import java.util.Properties

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties").takeIf { it.exists() }
    ?: project.file("key.properties").takeIf { it.exists() }
    ?: file("../key.properties").takeIf { it.exists() }
    ?: file("key.properties")

if (keystorePropertiesFile.exists()) {
    FileInputStream(keystorePropertiesFile).use {
        keystoreProperties.load(it)
    }
}

android {
    namespace = "com.equiptrack.com"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    signingConfigs {
        create("release") {
            keyAlias = keystoreProperties.getProperty("keyAlias")
            keyPassword = keystoreProperties.getProperty("keyPassword")
            storePassword = keystoreProperties.getProperty("storePassword")
            val storeFileProp = keystoreProperties.getProperty("storeFile")
            val resolvedStoreFile = if (!storeFileProp.isNullOrBlank()) {
                project.file(storeFileProp).takeIf { it.exists() }
                    ?: rootProject.file(storeFileProp).takeIf { it.exists() }
                    ?: rootProject.file("app/$storeFileProp").takeIf { it.exists() }
                    ?: project.file(storeFileProp)
            } else null
            storeFile = resolvedStoreFile
            storeType = "PKCS12"
            enableV1Signing = true
            enableV2Signing = true
        }
    }

val envFile = rootProject.file(".env").takeIf { it.exists() }
    ?: project.file("../../.env").takeIf { it.exists() }
val envProperties = Properties()
if (envFile != null && envFile.exists()) {
    envFile.bufferedReader().use { reader ->
        reader.forEachLine { line ->
            val trimmed = line.trim()
            if (trimmed.isNotEmpty() && !trimmed.startsWith("#") && trimmed.contains("=")) {
                val parts = trimmed.split("=", limit = 2)
                envProperties[parts[0].trim()] = parts[1].trim()
            }
        }
    }
}
val posthogToken = envProperties.getProperty("POSTHOG_PROJECT_TOKEN")
    ?: System.getenv("POSTHOG_PROJECT_TOKEN")
    ?: ""
val posthogHost = envProperties.getProperty("POSTHOG_HOST")
    ?: System.getenv("POSTHOG_HOST")
    ?: "https://us.i.posthog.com"

    defaultConfig {
        applicationId = "com.equiptrack.com"
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
        manifestPlaceholders["POSTHOG_PROJECT_TOKEN"] = posthogToken
        manifestPlaceholders["POSTHOG_HOST"] = posthogHost
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("release")
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
