import Foundation

// Stable identifier used for both the macOS LaunchAgent label and Nix-managed defaults suite.
// nix-littlebaby writes app defaults into this suite to survive app bundle identifier churn.
let launchdLabel = "ai.littlebaby.mac"
let gatewayLaunchdLabel = "ai.littlebaby.gateway"
let onboardingVersionKey = "littlebaby.onboardingVersion"
let onboardingSeenKey = "littlebaby.onboardingSeen"
let currentOnboardingVersion = 7
let pauseDefaultsKey = "littlebaby.pauseEnabled"
let iconAnimationsEnabledKey = "littlebaby.iconAnimationsEnabled"
let swabbleEnabledKey = "littlebaby.swabbleEnabled"
let swabbleTriggersKey = "littlebaby.swabbleTriggers"
let voiceWakeTriggerChimeKey = "littlebaby.voiceWakeTriggerChime"
let voiceWakeSendChimeKey = "littlebaby.voiceWakeSendChime"
let showDockIconKey = "littlebaby.showDockIcon"
let defaultVoiceWakeTriggers = ["littlebaby"]
let voiceWakeMaxWords = 32
let voiceWakeMaxWordLength = 64
let voiceWakeMicKey = "littlebaby.voiceWakeMicID"
let voiceWakeMicNameKey = "littlebaby.voiceWakeMicName"
let voiceWakeLocaleKey = "littlebaby.voiceWakeLocaleID"
let voiceWakeAdditionalLocalesKey = "littlebaby.voiceWakeAdditionalLocaleIDs"
let voicePushToTalkEnabledKey = "littlebaby.voicePushToTalkEnabled"
let voiceWakeTriggersTalkModeKey = "littlebaby.voiceWakeTriggersTalkMode"
let talkEnabledKey = "littlebaby.talkEnabled"
let iconOverrideKey = "littlebaby.iconOverride"
let connectionModeKey = "littlebaby.connectionMode"
let remoteTargetKey = "littlebaby.remoteTarget"
let remoteIdentityKey = "littlebaby.remoteIdentity"
let remoteProjectRootKey = "littlebaby.remoteProjectRoot"
let remoteCliPathKey = "littlebaby.remoteCliPath"
let canvasEnabledKey = "littlebaby.canvasEnabled"
let cameraEnabledKey = "littlebaby.cameraEnabled"
let systemRunPolicyKey = "littlebaby.systemRunPolicy"
let systemRunAllowlistKey = "littlebaby.systemRunAllowlist"
let systemRunEnabledKey = "littlebaby.systemRunEnabled"
let locationModeKey = "littlebaby.locationMode"
let locationPreciseKey = "littlebaby.locationPreciseEnabled"
let peekabooBridgeEnabledKey = "littlebaby.peekabooBridgeEnabled"
let deepLinkKeyKey = "littlebaby.deepLinkKey"
let modelCatalogPathKey = "littlebaby.modelCatalogPath"
let modelCatalogReloadKey = "littlebaby.modelCatalogReload"
let cliInstallPromptedVersionKey = "littlebaby.cliInstallPromptedVersion"
let heartbeatsEnabledKey = "littlebaby.heartbeatsEnabled"
let debugPaneEnabledKey = "littlebaby.debugPaneEnabled"
let debugFileLogEnabledKey = "littlebaby.debug.fileLogEnabled"
let appLogLevelKey = "littlebaby.debug.appLogLevel"
let voiceWakeSupported: Bool = ProcessInfo.processInfo.operatingSystemVersion.majorVersion >= 26
