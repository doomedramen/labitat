import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import {
  StatCard,
  StatGrid,
  ActiveStreamItem,
  ActiveStreamList,
  DownloadItem,
  DownloadList,
} from "@/components/widgets"

// Custom tooltip doesn't need a provider — renders at root level via TooltipRoot
function renderWithTooltip(ui: React.ReactElement) {
  return render(ui)
}

describe("StatCard", () => {
  it("renders value and label correctly", () => {
    render(<StatCard id="test-1" value={42} label="Test Label" />)
    expect(screen.getByText("42")).toBeInTheDocument()
    expect(screen.getByText("Test Label")).toBeInTheDocument()
  })

  it("renders icon when provided", () => {
    const TestIcon = () => <span data-testid="test-icon">🔥</span>
    renderWithTooltip(
      <StatCard
        id="test-2"
        value="Test"
        label="With Icon"
        icon={TestIcon}
        displayMode="icon"
      />
    )
    expect(screen.getByTestId("test-icon")).toBeInTheDocument()
    expect(screen.getByText("Test")).toBeInTheDocument()
    expect(screen.queryByText("With Icon")).not.toBeInTheDocument()
  })

  it("places icon below value in DOM order", () => {
    const TestIcon = () => <span data-testid="test-icon">🔥</span>
    const { container } = renderWithTooltip(
      <StatCard
        id="test-3"
        value="42"
        label="Test"
        icon={TestIcon}
        displayMode="icon"
      />
    )
    const valueElement = screen.getByText("42")
    const iconElement = screen.getByTestId("test-icon")
    const valuePosition = container.innerHTML.indexOf(valueElement.outerHTML)
    const iconPosition = container.innerHTML.indexOf(iconElement.outerHTML)
    expect(valuePosition).toBeLessThan(iconPosition)
  })

  it("applies custom valueClassName", () => {
    const { container } = render(
      <StatCard
        id="test-4"
        value="100"
        label="Custom"
        valueClassName="text-destructive"
      />
    )
    const valueElement = container.querySelector(".text-destructive")
    expect(valueElement).toBeInTheDocument()
    expect(valueElement).toHaveTextContent("100")
  })

  it("handles string values", () => {
    render(<StatCard id="test-5" value="Hello" label="String Value" />)
    expect(screen.getByText("Hello")).toBeInTheDocument()
  })
})

describe("StatGrid", () => {
  it("renders null when items array is empty", () => {
    const { container } = render(<StatGrid items={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it("renders multiple stat items", () => {
    const items = [
      { id: "first", value: 10, label: "First" },
      { id: "second", value: 20, label: "Second" },
      { id: "third", value: 30, label: "Third" },
    ]
    render(<StatGrid items={items} />)
    expect(screen.getByText("10")).toBeInTheDocument()
    expect(screen.getByText("First")).toBeInTheDocument()
    expect(screen.getByText("20")).toBeInTheDocument()
    expect(screen.getByText("Second")).toBeInTheDocument()
    expect(screen.getByText("30")).toBeInTheDocument()
    expect(screen.getByText("Third")).toBeInTheDocument()
  })

  it("applies custom column count", () => {
    const items = [
      { id: "a", value: 1, label: "A" },
      { id: "b", value: 2, label: "B" },
    ]
    const { container } = render(<StatGrid items={items} cols={3} />)
    const grid = container.firstChild as HTMLElement
    expect(grid).toHaveStyle({ gridTemplateColumns: "repeat(3, 1fr)" })
  })

  it("uses auto-fit when cols not specified", () => {
    const items = [{ id: "a", value: 1, label: "A" }]
    const { container } = render(<StatGrid items={items} />)
    const grid = container.firstChild as HTMLElement
    expect(grid).toHaveStyle({
      gridTemplateColumns: "repeat(auto-fit, minmax(60px, 1fr))",
    })
  })
})

describe("ActiveStreamItem", () => {
  const baseProps = {
    title: "Test Movie",
    user: "testuser",
    progress: 60,
    duration: 120,
  }

  it("renders stream item with playing state", () => {
    renderWithTooltip(<ActiveStreamItem {...baseProps} state="playing" />)
    expect(screen.getByText("Test Movie")).toBeInTheDocument()
    // User is now only in tooltip, not visible in list item
    expect(screen.queryByText("(testuser)")).not.toBeInTheDocument()
  })

  it("renders stream item with paused state", () => {
    renderWithTooltip(<ActiveStreamItem {...baseProps} state="paused" />)
    expect(screen.getByText("Test Movie")).toBeInTheDocument()
  })

  it("formats duration correctly", () => {
    renderWithTooltip(<ActiveStreamItem {...baseProps} />)
    // 120 - 60 = 60 seconds remaining = 1:00
    expect(screen.getByText("1:00")).toBeInTheDocument()
  })

  it("formats long duration with hours", () => {
    renderWithTooltip(
      <ActiveStreamItem
        title="Long Movie"
        user="user"
        progress={3661}
        duration={7200}
      />
    )
    // 7200 - 3661 = 3539 seconds remaining = 58:59
    expect(screen.getByText("58:59")).toBeInTheDocument()
  })

  it("shows tooltip on hover", () => {
    const { container } = renderWithTooltip(<ActiveStreamItem {...baseProps} />)
    // Tooltip trigger element should exist
    const trigger = container.querySelector('[data-slot="tooltip-trigger"]')
    expect(trigger).toBeInTheDocument()
  })

  it("handles zero duration gracefully", () => {
    renderWithTooltip(
      <ActiveStreamItem
        title="Zero Duration"
        user="user"
        progress={0}
        duration={0}
      />
    )
    expect(screen.getByText("0:00")).toBeInTheDocument()
  })
})

describe("ActiveStreamList", () => {
  it("renders null when streams array is empty", () => {
    const { container } = render(<ActiveStreamList streams={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it("sorts streams alphabetically by title", () => {
    const streams = [
      { title: "Zebra", user: "user1", progress: 0, duration: 100 },
      { title: "Alpha", user: "user2", progress: 0, duration: 100 },
      { title: "Middle", user: "user3", progress: 0, duration: 100 },
    ]
    renderWithTooltip(<ActiveStreamList streams={streams} />)
    const titles = screen
      .getAllByText(/.+/)
      .filter((el) =>
        ["Zebra", "Alpha", "Middle"].includes(el.textContent || "")
      )
    // Check order in DOM
    expect(titles[0]).toHaveTextContent("Alpha")
    expect(titles[1]).toHaveTextContent("Middle")
    expect(titles[2]).toHaveTextContent("Zebra")
  })

  it("renders multiple streams", () => {
    const streams = [
      { title: "Movie A", user: "user1", progress: 30, duration: 120 },
      { title: "Movie B", user: "user2", progress: 60, duration: 120 },
    ]
    renderWithTooltip(<ActiveStreamList streams={streams} />)
    expect(screen.getByText("Movie A")).toBeInTheDocument()
    expect(screen.getByText("Movie B")).toBeInTheDocument()
  })
})

describe("DownloadItem", () => {
  const baseProps = {
    title: "Test Download",
    progress: 50,
    timeLeft: "5 min",
    activity: "downloading",
    size: "1.5 GB",
  }

  it("renders download item with all props", () => {
    renderWithTooltip(<DownloadItem {...baseProps} />)
    expect(screen.getByText("Test Download")).toBeInTheDocument()
    expect(screen.getByText("downloading")).toBeInTheDocument()
    expect(screen.getByText("5 min")).toBeInTheDocument()
  })

  it("renders without optional props", () => {
    renderWithTooltip(<DownloadItem title="Simple" progress={25} />)
    expect(screen.getByText("Simple")).toBeInTheDocument()
  })

  it("shows size in tooltip and display", () => {
    renderWithTooltip(
      <DownloadItem
        title="With Size"
        progress={50}
        size="2 GB"
        activity="downloading"
        timeLeft="10 min"
      />
    )
    expect(screen.getByText("2 GB")).toBeInTheDocument()
    expect(screen.getByText("downloading")).toBeInTheDocument()
    expect(screen.getByText("10 min")).toBeInTheDocument()
  })

  it("shows activity without timeLeft", () => {
    renderWithTooltip(
      <DownloadItem title="No Time" progress={75} activity="seeding" />
    )
    expect(screen.getByText("seeding")).toBeInTheDocument()
  })

  it("clamps progress to 0-100 range visually", () => {
    const { container: c1 } = renderWithTooltip(
      <DownloadItem title="Over" progress={150} />
    )
    const bar1 = c1.querySelector('[style*="width: 100%"]')
    expect(bar1).toBeInTheDocument()

    const { container: c2 } = renderWithTooltip(
      <DownloadItem title="Zero" progress={0} />
    )
    const bar2 = c2.querySelector('[style*="width: 0%"]')
    expect(bar2).toBeInTheDocument()
  })
})

describe("DownloadList", () => {
  it("renders null when downloads array is empty", () => {
    const { container } = render(<DownloadList downloads={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it("renders multiple download items", () => {
    const downloads = [
      { title: "File A", progress: 25 },
      { title: "File B", progress: 75 },
    ]
    renderWithTooltip(<DownloadList downloads={downloads} />)
    expect(screen.getByText("File A")).toBeInTheDocument()
    expect(screen.getByText("File B")).toBeInTheDocument()
  })
})
