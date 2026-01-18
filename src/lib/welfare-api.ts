import { XMLParser } from "fast-xml-parser";

export type WelfareListItem = {
  servId: string;
  servNm: string | null;
  agency: string | null;
  jurisdiction: string | null;
  summary: string | null;
  support: string | null;
  conditions: string | null;
  target: string | null;
  apply: string | null;
  cycle: string | null;
  contact: string | null;
  detailUrl: string | null;
};

export type WelfareAttachment = {
  name: string;
  url: string;
};

export type WelfareDetail = {
  servId: string;
  servNm: string | null;
  agency: string | null;
  jurisdiction: string | null;
  summary: string | null;
  support: string | null;
  conditions: string | null;
  target: string | null;
  apply: string | null;
  cycle: string | null;
  contact: string | null;
  attachments: WelfareAttachment[];
};

const NATIONAL_LIST_URL =
  "https://apis.data.go.kr/B554287/NationalWelfareInformationsV001/NationalWelfarelistV001";
const NATIONAL_DETAIL_URL =
  "https://apis.data.go.kr/B554287/NationalWelfareInformationsV001/NationalWelfaredetailedV001";
const LOCAL_LIST_URL =
  "https://apis.data.go.kr/B554287/LocalGovernmentWelfareInformations/LcgvWelfarelist";
const LOCAL_DETAIL_URL =
  "https://apis.data.go.kr/B554287/LocalGovernmentWelfareInformations/LcgvWelfaredetailed";

const parser = new XMLParser({
  ignoreAttributes: false,
});

const normalizeText = (value: unknown): string | null => {
  if (!value) return null;
  const text = String(value).replace(/\s+/g, " ").trim();
  return text.length ? text : null;
};

const normalizeArray = <T>(value: T | T[] | null | undefined): T[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const getServiceKey = (): string => {
  const key = process.env.WELFARE_API_KEY || process.env.SERVICE_KEY;
  if (!key) {
    throw new Error(
      "Missing API key. Set WELFARE_API_KEY or SERVICE_KEY in the environment.",
    );
  }
  return key;
};

const buildQuery = (
  params: Record<string, string | number | null | undefined>,
): string => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    searchParams.set(key, String(value));
  });
  const serviceKey = getServiceKey();
  const query = searchParams.toString();
  return query ? `serviceKey=${serviceKey}&${query}` : `serviceKey=${serviceKey}`;
};

const fetchXml = async (
  url: string,
  params: Record<string, string | number | null | undefined>,
): Promise<Record<string, any>> => {
  const query = buildQuery(params);
  const response = await fetch(`${url}?${query}`);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API request failed (${response.status}): ${body}`);
  }
  const text = await response.text();
  return parser.parse(text);
};

const mapNationalListItem = (item: Record<string, any>): WelfareListItem => ({
  servId: String(item.servId ?? "").trim(),
  servNm: normalizeText(item.servNm),
  agency: normalizeText(item.jurMnofNm),
  jurisdiction: normalizeText(item.jurOrgNm),
  summary: normalizeText(item.servDgst),
  support: normalizeText(item.srvPvsnNm),
  conditions: null,
  target: normalizeText(item.trgterIndvdlArray),
  apply: null,
  cycle: normalizeText(item.sprtCycNm),
  contact: normalizeText(item.rprsCtadr),
  detailUrl: normalizeText(item.servDtlLink),
});

const mapLocalListItem = (item: Record<string, any>): WelfareListItem => ({
  servId: String(item.servId ?? "").trim(),
  servNm: normalizeText(item.servNm),
  agency: normalizeText(item.bizChrDeptNm),
  jurisdiction: [normalizeText(item.ctpvNm), normalizeText(item.sggNm)]
    .filter(Boolean)
    .join(" ") || null,
  summary: normalizeText(item.servDgst),
  support: normalizeText(item.srvPvsnNm),
  conditions: null,
  target: normalizeText(item.trgterIndvdlNmArray),
  apply: normalizeText(item.aplyMtdNm),
  cycle: normalizeText(item.sprtCycNm),
  contact: null,
  detailUrl: normalizeText(item.servDtlLink),
});

export const fetchNationalList = async ({
  pageNo = 1,
  numOfRows = 10,
  age,
  searchWrd,
}: {
  pageNo?: number;
  numOfRows?: number;
  age?: number;
  searchWrd?: string;
}): Promise<WelfareListItem[]> => {
  const data = await fetchXml(NATIONAL_LIST_URL, {
    pageNo,
    numOfRows,
    srchKeyCode: "003",
    age,
    searchWrd,
  });
  const list = normalizeArray(data?.wantedList?.servList);
  return list.map(mapNationalListItem).filter((item) => item.servId);
};

export const fetchLocalList = async ({
  pageNo = 1,
  numOfRows = 10,
  age,
  searchWrd,
  ctpvNm,
  sggNm,
}: {
  pageNo?: number;
  numOfRows?: number;
  age?: number;
  searchWrd?: string;
  ctpvNm?: string;
  sggNm?: string;
}): Promise<WelfareListItem[]> => {
  const data = await fetchXml(LOCAL_LIST_URL, {
    pageNo,
    numOfRows,
    ctpvNm,
    sggNm,
    age,
    searchWrd,
  });
  const list = normalizeArray(data?.wantedList?.servList);
  return list.map(mapLocalListItem).filter((item) => item.servId);
};

const mapNationalDetail = (detail: Record<string, any>): WelfareDetail => {
  const attachments: WelfareAttachment[] = [];
  for (const entry of normalizeArray(detail.basfrmList)) {
    const name = normalizeText(entry.servSeDetailNm);
    const url = normalizeText(entry.servSeDetailLink);
    if (name && url) attachments.push({ name, url });
  }
  for (const entry of normalizeArray(detail.inqplHmpgReldList)) {
    const name = normalizeText(entry.servSeDetailNm);
    const url = normalizeText(entry.servSeDetailLink);
    if (name && url) attachments.push({ name, url });
  }
  return {
    servId: String(detail.servId ?? "").trim(),
    servNm: normalizeText(detail.servNm),
    agency: normalizeText(detail.jurMnofNm),
    jurisdiction: normalizeText(detail.jurOrgNm),
    summary: normalizeText(detail.wlfareInfoOutlCn),
    support: normalizeText(detail.alwServCn) || normalizeText(detail.srvPvsnNm),
    conditions: normalizeText(detail.slctCritCn),
    target: normalizeText(detail.trgterIndvdlArray),
    apply: normalizeText(detail.aplyMtdCn),
    cycle: normalizeText(detail.sprtCycNm),
    contact: normalizeText(detail.rprsCtadr),
    attachments,
  };
};

const mapLocalDetail = (detail: Record<string, any>): WelfareDetail => {
  const attachments: WelfareAttachment[] = [];
  for (const entry of normalizeArray(detail.basfrmList)) {
    const name = normalizeText(entry.wlfareInfoReldNm);
    const url = normalizeText(entry.wlfareInfoReldCn);
    if (name && url) attachments.push({ name, url });
  }
  for (const entry of normalizeArray(detail.inqplCtadrList)) {
    const name = normalizeText(entry.wlfareInfoReldNm);
    const url = normalizeText(entry.wlfareInfoReldCn);
    if (name && url && url.startsWith("http")) attachments.push({ name, url });
  }
  return {
    servId: String(detail.servId ?? "").trim(),
    servNm: normalizeText(detail.servNm),
    agency: normalizeText(detail.bizChrDeptNm),
    jurisdiction: [normalizeText(detail.ctpvNm), normalizeText(detail.sggNm)]
      .filter(Boolean)
      .join(" ") || null,
    summary: normalizeText(detail.servDgst),
    support: normalizeText(detail.alwServCn) || normalizeText(detail.srvPvsnNm),
    conditions: normalizeText(detail.slctCritCn) || normalizeText(detail.sprtTrgtCn),
    target: normalizeText(detail.trgterIndvdlNmArray),
    apply: normalizeText(detail.aplyMtdCn) || normalizeText(detail.aplyMtdNm),
    cycle: normalizeText(detail.sprtCycNm),
    contact: null,
    attachments,
  };
};

export const fetchNationalDetail = async (
  servId: string,
): Promise<WelfareDetail | null> => {
  const data = await fetchXml(NATIONAL_DETAIL_URL, { servId });
  const detail = data?.wantedDtl;
  if (!detail) return null;
  return mapNationalDetail(detail);
};

export const fetchLocalDetail = async (
  servId: string,
): Promise<WelfareDetail | null> => {
  const data = await fetchXml(LOCAL_DETAIL_URL, { servId });
  const detail = data?.wantedDtl;
  if (!detail) return null;
  return mapLocalDetail(detail);
};
