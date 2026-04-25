import Foundation
import Testing
@testable import LittleBaby

@Suite(.serialized) struct NodeServiceManagerTests {
    @Test func `builds node service commands with current CLI shape`() async throws {
        try await TestIsolation.withUserDefaultsValues(["littlebaby.gatewayProjectRootPath": nil]) {
            let tmp = try makeTempDirForTests()
            CommandResolver.setProjectRoot(tmp.path)

            let littlebabyPath = tmp.appendingPathComponent("node_modules/.bin/littlebaby")
            try makeExecutableForTests(at: littlebabyPath)

            let start = NodeServiceManager._testServiceCommand(["start"])
            #expect(start == [littlebabyPath.path, "node", "start", "--json"])

            let stop = NodeServiceManager._testServiceCommand(["stop"])
            #expect(stop == [littlebabyPath.path, "node", "stop", "--json"])
        }
    }
}
