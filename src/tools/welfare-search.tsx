import { defineTool } from "chapplin/tool";
import {
  Button,
  Card,
  Collapse,
  Progress,
  Spin,
  Space,
  Tag,
  Typography,
} from "antd";
import { useEffect, useState } from "react";
import z from "zod";
import {
  fetchLocalDetail,
  fetchLocalList,
  fetchNationalDetail,
  fetchNationalList,
} from "../lib/welfare-api.js";
import type {
  WelfareAttachment,
  WelfareDetail,
  WelfareListItem,
} from "../lib/welfare-api.js";

if (typeof window !== "undefined") {
  import("antd/dist/reset.css");
}

const sourceEnum = z.enum(["national", "local"]);

const inputSchema = {
  age: z.number().int().min(0).optional(),
  searchWrd: z
    .string()
    .min(1)
    .describe("검색어는 핵심 키워드만 입력 (예: 신혼부부, 청년, 주거)"),
  ctpvNm: z.string().optional(),
  sggNm: z.string().optional(),
  sources: z.array(sourceEnum).optional(),
  pageNo: z.number().int().min(1).optional(),
  numOfRows: z.number().int().min(1).max(50).optional(),
  maxResults: z.number().int().min(1).max(20).optional(),
};

const outputSchema = {
  query: z.object({
    age: z.number().nullable(),
    searchWrd: z.string().nullable(),
    ctpvNm: z.string().nullable(),
    sggNm: z.string().nullable(),
    sources: z.array(z.string()),
  }),
  totalCount: z.number(),
  items: z.array(
    z.object({
      servId: z.string(),
      servNm: z.string().nullable(),
      source: sourceEnum,
      agency: z.string().nullable(),
      jurisdiction: z.string().nullable(),
      summary: z.string().nullable(),
      support: z.string().nullable(),
      conditions: z.string().nullable(),
      target: z.string().nullable(),
      apply: z.string().nullable(),
      cycle: z.string().nullable(),
      contact: z.string().nullable(),
      detailUrl: z.string().nullable(),
      attachments: z.array(
        z.object({
          name: z.string(),
          url: z.string(),
        }),
      ),
    }),
  ),
};

type Source = z.infer<typeof sourceEnum>;

type ToolInput = {
  age?: number;
  searchWrd: string;
  ctpvNm?: string;
  sggNm?: string;
  sources?: Source[];
  pageNo?: number;
  numOfRows?: number;
  maxResults?: number;
};

type ListRow = WelfareListItem & {
  source: Source;
};

type EnrichedRow = ListRow & {
  attachments: WelfareAttachment[];
};

type SummaryResource = {
  generatedAt: string;
  query: {
    age: number | null;
    searchWrd: string | null;
    ctpvNm: string | null;
    sggNm: string | null;
    sources: Source[];
  };
  items: Array<{
    servId: string;
    servNm: string | null;
    source: Source;
    jurisdiction: string | null;
    agency: string | null;
    support: string | null;
    conditions: string | null;
    target: string | null;
    cycle: string | null;
  }>;
};

let lastSummary: SummaryResource | null = null;

export const getLastSummary = () => lastSummary;

const mockOutput = {
  totalCount: 6,
  items: [
    {
      servId: "DEV0001",
      servNm: "청년 주거비 지원(더미)",
      source: "local" as const,
      agency: "서울특별시",
      jurisdiction: "서울특별시 송파구",
      summary: "청년 월세·보증금 부담을 덜어주는 지원 서비스입니다.",
      support: "월 최대 20만원, 최대 12개월",
      conditions: "만 19~39세, 중위소득 150% 이하",
      target: "청년 1인 가구",
      apply: "온라인 신청",
      cycle: "매월",
      contact: "02-0000-0000",
      detailUrl: "https://www.bokjiro.go.kr/",
      attachments: [
        {
          name: "신청서(더미).pdf",
          url: "https://www.bokjiro.go.kr/",
        },
      ],
    },
    {
      servId: "DEV0002",
      servNm: "신혼부부 전세대출 이자지원(더미)",
      source: "national" as const,
      agency: "국토교통부",
      jurisdiction: "중앙부처",
      summary: "신혼부부 전세자금 이자 부담을 완화합니다.",
      support: "연 2.0%p 이자 지원",
      conditions: "혼인 7년 이내, 중위소득 180% 이하",
      target: "신혼부부",
      apply: "지자체 방문/온라인",
      cycle: "연 1회",
      contact: "1566-0000",
      detailUrl: "https://www.bokjiro.go.kr/",
      attachments: [],
    },
    {
      servId: "DEV0003",
      servNm: "청년 월세 한시 지원(더미)",
      source: "national" as const,
      agency: "국토교통부",
      jurisdiction: "중앙부처",
      summary:
        "청년의 월세 부담을 완화하는 한시 지원입니다. 지원 대상은 무주택 청년으로, "
        + "소득 기준과 거주 요건을 충족해야 합니다. 신청 기간은 매 분기 공고되며 "
        + "제출 서류가 많아 사전 준비가 필요합니다. 실제 지원 금액과 기간은 "
        + "개별 심사 결과에 따라 달라질 수 있습니다.",
      support: "월 최대 20만원, 최대 12개월",
      conditions: "만 19~34세, 중위소득 150% 이하",
      target: "무주택 청년",
      apply: "온라인 신청",
      cycle: "매월",
      contact: "1599-0000",
      detailUrl: "https://www.bokjiro.go.kr/",
      attachments: [],
    },
    {
      servId: "DEV0004",
      servNm: "주거취약계층 주택개선(더미)",
      source: "local" as const,
      agency: "서울특별시",
      jurisdiction: "서울특별시 송파구",
      summary: "주거 환경 개선을 위한 리모델링 지원입니다.",
      support: "최대 500만원 범위 내 개선",
      conditions: "중위소득 100% 이하",
      target: "주거취약계층",
      apply: "주민센터 방문",
      cycle: "연 1회",
      contact: "02-1111-2222",
      detailUrl: "https://www.bokjiro.go.kr/",
      attachments: [
        {
          name: "안내문(더미).pdf",
          url: "https://www.bokjiro.go.kr/",
        },
        {
          name: "지원신청서(더미).hwp",
          url: "https://www.bokjiro.go.kr/",
        },
        {
          name: "개인정보동의서(더미).pdf",
          url: "https://www.bokjiro.go.kr/",
        },
      ],
    },
    {
      servId: "DEV0005",
      servNm: "전세자금 보증료 지원(더미)",
      source: "local" as const,
      agency: "서울특별시",
      jurisdiction: "서울특별시 송파구",
      summary: "전세자금 보증료 부담을 낮춰주는 지원입니다.",
      support: "보증료 최대 30만원",
      conditions: "무주택 세대, 중위소득 180% 이하",
      target: "청년/신혼부부",
      apply: "온라인 신청",
      cycle: "연 1회",
      contact: "02-2222-3333",
      detailUrl: "https://www.bokjiro.go.kr/",
      attachments: [],
    },
    {
      servId: "DEV0006",
      servNm: "주택청약저축 납입지원(더미)",
      source: "national" as const,
      agency: "국토교통부",
      jurisdiction: "중앙부처",
      summary: "청약저축 납입 부담을 완화합니다.",
      support: "월 2만원 납입 지원",
      conditions: "만 19~34세, 중위소득 120% 이하",
      target: "청년 1인 가구",
      apply: "온라인 신청",
      cycle: "매월",
      contact: "1566-4444",
      detailUrl: "https://www.bokjiro.go.kr/",
      attachments: [],
    },
  ],
};

const mergeDetail = (
  listItem: ListRow,
  detail: WelfareDetail | null,
): EnrichedRow => {
  if (!detail) {
    return {
      ...listItem,
      attachments: [],
    };
  }
  return {
    ...listItem,
    servNm: detail.servNm || listItem.servNm,
    agency: detail.agency || listItem.agency,
    jurisdiction: detail.jurisdiction || listItem.jurisdiction,
    summary: detail.summary || listItem.summary,
    support: detail.support || listItem.support,
    conditions: detail.conditions || listItem.conditions,
    target: detail.target || listItem.target,
    apply: detail.apply || listItem.apply,
    cycle: detail.cycle || listItem.cycle,
    contact: detail.contact || listItem.contact,
    attachments: detail.attachments || [],
  };
};

export default defineTool(
  "search_welfare",
  {
    inputSchema,
    outputSchema,
  },
  async ({
    age,
    searchWrd,
    ctpvNm,
    sggNm,
    sources,
    pageNo,
    numOfRows,
    maxResults,
  }: ToolInput) => {
    console.log("[search_welfare] input", {
      age,
      searchWrd,
      ctpvNm,
      sggNm,
      sources,
      pageNo,
      numOfRows,
      maxResults,
    });
    const useSources: Source[] = sources?.length
      ? sources
      : ["national", "local"];
    const listRows: ListRow[] = [];

    if (useSources.includes("national")) {
      const nationalList = await fetchNationalList({
        pageNo,
        numOfRows,
        age,
        searchWrd,
      });
      listRows.push(
        ...nationalList.map((item) => ({
          ...item,
          source: "national" as const,
        })),
      );
    }

    if (useSources.includes("local")) {
      const localList = await fetchLocalList({
        pageNo,
        numOfRows,
        age,
        searchWrd,
        ctpvNm,
        sggNm,
      });
      listRows.push(
        ...localList.map((item) => ({
          ...item,
          source: "local" as const,
        })),
      );
    }

    const limit = Math.min(maxResults ?? 6, listRows.length);
    const picked = listRows.slice(0, limit);
    const enriched: EnrichedRow[] = [];
    for (const item of picked) {
      const detail =
        item.source === "national"
          ? await fetchNationalDetail(item.servId)
          : await fetchLocalDetail(item.servId);
      enriched.push(mergeDetail(item, detail));
    }

    const responsePayload = {
      query: {
        age: age ?? null,
        searchWrd: searchWrd ?? null,
        ctpvNm: ctpvNm ?? null,
        sggNm: sggNm ?? null,
        sources: useSources,
      },
      totalCount: listRows.length,
      items: enriched,
    };

    lastSummary = {
      generatedAt: new Date().toISOString(),
      query: {
        age: responsePayload.query.age,
        searchWrd: responsePayload.query.searchWrd,
        ctpvNm: responsePayload.query.ctpvNm,
        sggNm: responsePayload.query.sggNm,
        sources: useSources,
      },
      items: enriched.map((item) => ({
        servId: item.servId,
        servNm: item.servNm,
        source: item.source,
        jurisdiction: item.jurisdiction,
        agency: item.agency,
        support: item.support,
        conditions: item.conditions,
        target: item.target,
        cycle: item.cycle,
      })),
    };

    console.log("[search_welfare] response", {
      totalCount: responsePayload.totalCount,
      returned: responsePayload.items.length,
      sources: responsePayload.query.sources,
      servIds: responsePayload.items.map((item) => item.servId),
    });
    console.log(
      "[search_welfare] response_payload",
      JSON.stringify(responsePayload, null, 2),
    );

    return {
      content: [
        {
          type: "text",
          text: `Found ${enriched.length} policies (from ${listRows.length} matches).`,
        },
      ],
      structuredContent: responsePayload,
    };
  },
  {
    app: ({ toolOutput }) => {
      const [devView, setDevView] = useState<typeof mockOutput | null>(null);
      const [devLoading, setDevLoading] = useState(false);
      const [loadingPercent, setLoadingPercent] = useState(10);
      const [expandedId, setExpandedId] = useState<string | null>(null);

      const hasResult = !!toolOutput?.items;

      useEffect(() => {
        if (!import.meta.env?.DEV) return;
        if (hasResult) {
          setDevView(null);
          setDevLoading(false);
          setLoadingPercent(10);
          return;
        }
        setDevLoading(true);
        setLoadingPercent(10);
        const progressTimer = setInterval(() => {
          setLoadingPercent((prev) => (prev >= 95 ? 15 : prev + 3));
        }, 150);
        const timer = setTimeout(() => {
          setDevView(mockOutput);
          setDevLoading(false);
        }, 3000);
        return () => {
          clearTimeout(timer);
          clearInterval(progressTimer);
        };
      }, [hasResult]);

      const view = hasResult ? toolOutput : devView;
      const loading = hasResult ? false : import.meta.env?.DEV ? devLoading : true;

      return (
        <div style={{ padding: "16px", background: "#f7f8fa" }}>
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            {loading && <div>
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Typography.Text type="secondary">
                    복지서비스를 검색 중입니다.
                  </Typography.Text>
                  <Progress
                    percent={loadingPercent}
                    status="active"
                    strokeColor={["#1677ff", "#52c41a"]}
                    showInfo={false}
                  />
                </Space>
              </div>
            }
            {!loading && (
              <>
                <div>
                  <Typography.Title level={4}>
                    복지서비스 항목
                  </Typography.Title>
                  <Typography.Text type="secondary" style={{ display: "block", rowGap: '2px' }}>
                    중앙부처{" "}
                    {view?.items?.filter((item) => item.source === "national")
                      .length ?? 0}
                    건, 지자체{" "}
                    {view?.items?.filter((item) => item.source === "local")
                      .length ?? 0}
                    건 조회했습니다.
                  </Typography.Text>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "16px",
                    overflowX: "auto",
                    paddingBottom: "12px",
                  }}
                >
                  {view?.items?.map((item) => {
                    const isExpanded = expandedId === item.servId;
                    return (
                    <Card
                      key={`card-${item.servId}`}
                      style={{
                        width: isExpanded ? "fit-content" : 280,
                        maxWidth: "80vw",
                        minWidth: 280,
                        flex: "0 0 auto",
                      }}
                      title={item.servNm || item.servId}
                      extra={
                        <Tag
                          color={item.source === "national" ? "blue" : "green"}
                        >
                          {item.source === "national" ? "중앙부처" : "지자체"}
                        </Tag>
                      }
                    >
                      <Space direction="vertical" size="small">
                        <Typography.Paragraph
                          ellipsis={{ rows: 2 }}
                          style={{ margin: 0 }}
                        >
                          {item.summary || "요약 없음"}
                        </Typography.Paragraph>
                        <Typography.Text type="secondary">
                          {item.jurisdiction || item.agency || "-"}
                        </Typography.Text>
                        {item.detailUrl && (
                          <Button
                            type="link"
                            href={item.detailUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{ padding: 0 }}
                          >
                            상세 페이지 이동
                          </Button>
                        )}
                        <Collapse
                          size="small"
                          onChange={(keys) => {
                            const hasOpen = Array.isArray(keys)
                              ? keys.length > 0
                              : !!keys;
                            setExpandedId(hasOpen ? item.servId : null);
                          }}
                          items={[
                            {
                              key: "details",
                              label: "상세 보기",
                              children: (
                                <Space direction="vertical" size="small">
                                  <Typography.Text>
                                    <strong>설명:</strong>{" "}
                                    {item.summary || "요약 없음"}
                                  </Typography.Text>
                                  <Typography.Text>
                                    <strong>지원내용:</strong>{" "}
                                    {item.support || "-"}
                                  </Typography.Text>
                                  <Typography.Text>
                                    <strong>지원조건:</strong>{" "}
                                    {item.conditions || "-"}
                                  </Typography.Text>
                                  <Typography.Text>
                                    <strong>대상:</strong> {item.target || "-"}
                                  </Typography.Text>
                                  <Typography.Text>
                                    <strong>신청방법:</strong> {item.apply || "-"}
                                  </Typography.Text>
                                  <Typography.Text>
                                    <strong>문의:</strong> {item.contact || "-"}
                                  </Typography.Text>
                                  {item.attachments.length > 0 && (
                                    <Space direction="vertical">
                                      {item.attachments.map((file) => (
                                        <Button
                                          key={file.url}
                                          size="small"
                                          href={file.url}
                                          target="_blank"
                                          rel="noreferrer"
                                        >
                                          {file.name}
                                        </Button>
                                      ))}
                                    </Space>
                                  )}
                                </Space>
                              ),
                            },
                          ]}
                        />
                      </Space>
                    </Card>
                    );
                  })}
                </div>
              </>
            )}
            {loading && (
              <Card>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "220px",
                  }}
                >
                  <Spin size="large" />
                </div>
              </Card>
            )}
          </Space>
        </div>
      );
    },
  },
);
