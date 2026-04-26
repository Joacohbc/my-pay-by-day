import re

with open("frontend/src/components/events/EventsListView.tsx", "r") as f:
    content = f.read()

# 1. Add useNodes import
content = content.replace(
    "import { useTags } from '@/hooks/useTags';",
    "import { useTags } from '@/hooks/useTags';\nimport { useNodes } from '@/hooks/useNodes';"
)

# 2. Get nodes via useNodes hook inside EventsListView component
# Find the start of the component body
search_str = "  const { data: categoriesResponse } = useCategories();"
nodes_code = """
  const { data: nodesResponse } = useNodes(0, 200);
  const nodes = Array.isArray(nodesResponse)
    ? nodesResponse
    : nodesResponse?.content || [];

  const { data: categoriesResponse } = useCategories();"""

content = content.replace(search_str, nodes_code)

# 3. Pass `nodes` instead of `[]` to EventSearchbarFilter
content = content.replace(
    "          nodes={[]}",
    "          nodes={nodes}"
)

with open("frontend/src/components/events/EventsListView.tsx", "w") as f:
    f.write(content)
