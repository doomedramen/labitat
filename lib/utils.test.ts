import { describe, it, expect } from "vitest"
import { cn } from "@/lib/utils"

describe("utils", () => {
  describe("cn", () => {
    it("merges class names correctly", () => {
      const result = cn("foo", "bar")
      expect(result).toBe("foo bar")
    })

    it("handles conditional classes", () => {
      const result = cn("base", true && "active", false && "disabled")
      expect(result).toBe("base active")
    })

    it("merges Tailwind classes intelligently", () => {
      // twMerge should handle conflicting classes
      const result = cn("px-2 py-1", "px-4")
      expect(result).toBe("py-1 px-4")
    })

    it("handles empty inputs", () => {
      const result = cn()
      expect(result).toBe("")
    })

    it("handles null and undefined", () => {
      const result = cn("foo", null, undefined, "bar")
      expect(result).toBe("foo bar")
    })

    it("handles array inputs", () => {
      const result = cn(["foo", "bar"], "baz")
      expect(result).toBe("foo bar baz")
    })
  })
})
