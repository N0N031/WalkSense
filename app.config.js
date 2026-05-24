// Load .env for local builds (EAS cloud ignores this, uses EAS secrets)
try {
  require("dotenv").config();
} catch {}

const googleMapsAndroidApiKey =
  process.env.GOOGLE_MAPS_ANDROID_API_KEY?.trim();

const easBuildProfile = process.env.EAS_BUILD_PROFILE || "current";

if (!googleMapsAndroidApiKey?.startsWith("AIza")) {
  throw new Error(
    `GOOGLE_MAPS_ANDROID_API_KEY invalide ou absente.\n` +
      `Profil EAS actif : ${easBuildProfile}\n` +
      `Commande : eas env:create`,
  );
}

if (
  process.env.EAS_BUILD === "true" &&
  (!googleMapsAndroidApiKey ||
    googleMapsAndroidApiKey === "TA_CLE_GOOGLE_MAPS")
) {
  throw new Error(
    [
      "GOOGLE_MAPS_ANDROID_API_KEY must be set for EAS Android builds.",
      `Active EAS build profile: ${easBuildProfile}.`,
      "Set it in the EAS environment used by that profile, for example:",
      "eas env:create --environment production --name GOOGLE_MAPS_ANDROID_API_KEY --value <google-maps-android-api-key> --visibility sensitive",
    ].join(" "),
  );
}

export default {
  expo: {
    name: "WalkSense",
    slug: "WalkSense",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icons/ios/appicon.png",
    splash: {
      image: "./assets/images/walksense-mark-source-transparent.png",
      imageWidth: 170,
      resizeMode: "contain",
      backgroundColor: "#050505",
    },
    scheme: "walksense",
    userInterfaceStyle: "automatic",
    newArchEnabled: false,

    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.anonymous.WalkSense",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },

    android: {
      package: "com.anonymous.WalkSense",
      config: {
        googleMaps: {
          apiKey: googleMapsAndroidApiKey,
        },
      },
      adaptiveIcon: {
        foregroundImage:
          "./assets/images/icons/android/adaptive-foreground.png",
        backgroundColor: "#050505",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      // APK interne : arm64-v8a uniquement (réduit temps de build et mémoire)
      buildGradleExtraContent: `
android {
    defaultConfig {
        ndk {
            abiFilters "arm64-v8a"
        }
    }
}
`,
      permissions: [
        "android.permission.INTERNET",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_BACKGROUND_LOCATION",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.FOREGROUND_SERVICE_LOCATION",
      ],
      blockedPermissions: ["android.permission.RECORD_AUDIO"],
    },

    web: {
      output: "static",
      favicon: "./assets/images/icons/ios/appicon.png",
    },

    plugins: [
      "expo-router",
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "WalkSense utilise votre position pour enregistrer vos sessions de détection terrain.",
          locationWhenInUsePermission:
            "WalkSense utilise votre position pour enregistrer vos sessions de détection terrain.",
          isAndroidBackgroundLocationEnabled: true,
        },
      ],
      [
        "expo-splash-screen",
        {
          image: "./assets/images/walksense-mark-source-transparent.png",
          imageWidth: 170,
          resizeMode: "contain",
          backgroundColor: "#050505",
          dark: {
            backgroundColor: "#050505",
          },
        },
      ],
      [
        "expo-image-picker",
        {
          photosPermission:
            "WalkSense utilise vos photos pour associer une image aux trouvailles.",
          cameraPermission:
            "WalkSense utilise la camera pour photographier les trouvailles.",
        },
      ],
      "expo-secure-store",
    ],

    experiments: {
      typedRoutes: true,
      reactCompiler: false,
    },

    extra: {
      router: {},
      eas: {
        projectId: "dda91383-427d-40f9-ac16-5a36d8fd7c7e",
      },
    },
  },
};
