import re

with open("frontend/src/pages/EventsPage.tsx", "r") as f:
    content = f.read()

# 1. Update FILTER_PARAMS
content = content.replace(
    "  mergeIds: { key: 'mergeIds', defaultValue: '', type: 'string' },",
    "  mergeIds: { key: 'mergeIds', defaultValue: '', type: 'string' },\n  nodeId: { key: 'node', defaultValue: '', type: 'string' },"
)

# 2. Extract from useSearchParamsBatch
content = content.replace(
    "    mergeIdsStr = '',",
    "    mergeIdsStr = '',\n    nodeIdStr = '',"
)

content = content.replace(
    "    mergeIdsStr: values.mergeIds as string,",
    "    mergeIdsStr: values.mergeIds as string,\n    nodeIdStr: values.nodeId as string,"
)

# 3. Add useMemo for nodeIdArr or nodeIdNum
content = content.replace(
    "  const tagIdsArr = useMemo(",
    "  const nodeIdNum = useMemo(() => (nodeIdStr ? Number(nodeIdStr) : undefined), [nodeIdStr]);\n\n  const tagIdsArr = useMemo("
)

# 4. Update Advanced Filters State
content = content.replace(
    "    () => ({ startDate, endDate, dateField, categoryIds: categoryIdsArr, tagIds: tagIdsArr }),\n    [startDate, endDate, dateField, categoryIdsArr, tagIdsArr]",
    "    () => ({ startDate, endDate, dateField, categoryIds: categoryIdsArr, tagIds: tagIdsArr, nodeId: nodeIdNum }),\n    [startDate, endDate, dateField, categoryIdsArr, tagIdsArr, nodeIdNum]"
)

content = content.replace(
    "        tagIds: next.tagIds.length ? next.tagIds.join(',') : '',",
    "        tagIds: next.tagIds.length ? next.tagIds.join(',') : '',\n        nodeId: next.nodeId ? String(next.nodeId) : '',"
)

# 5. Add nodeId to useEvents
content = content.replace(
    "    tagIds: tagIdsArr.length ? tagIdsArr : undefined,",
    "    tagIds: tagIdsArr.length ? tagIdsArr : undefined,\n    nodeId: nodeIdNum,"
)

with open("frontend/src/pages/EventsPage.tsx", "w") as f:
    f.write(content)
