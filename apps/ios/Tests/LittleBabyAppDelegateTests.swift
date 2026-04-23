import Testing
@testable import LittleBaby

@Suite(.serialized) struct LittleBabyAppDelegateTests {
    @Test @MainActor func resolvesRegistryModelBeforeViewTaskAssignsDelegateModel() {
        let registryModel = NodeAppModel()
        LittleBabyAppModelRegistry.appModel = registryModel
        defer { LittleBabyAppModelRegistry.appModel = nil }

        let delegate = LittleBabyAppDelegate()

        #expect(delegate._test_resolvedAppModel() === registryModel)
    }

    @Test @MainActor func prefersExplicitDelegateModelOverRegistryFallback() {
        let registryModel = NodeAppModel()
        let explicitModel = NodeAppModel()
        LittleBabyAppModelRegistry.appModel = registryModel
        defer { LittleBabyAppModelRegistry.appModel = nil }

        let delegate = LittleBabyAppDelegate()
        delegate.appModel = explicitModel

        #expect(delegate._test_resolvedAppModel() === explicitModel)
    }
}
