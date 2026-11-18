import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { keys } from "../../api/queryKeys";
import type { Report } from "../../api/schemas";
import { makeReport, makeStaffComment, makeStaffPost, makeStaffUser } from "../../test/factories";
import { removeHiddenItem, removeReportFromQueues, setAuthorStatus, setTargetStatus } from "./adminCache";

const queue = (...r: Report[]) => ({ pages: [{ items: r, nextCursor: null }], pageParams: [undefined] });
const items = (qc: QueryClient, key: readonly unknown[]) =>
  qc.getQueryData<ReturnType<typeof queue>>(key)?.pages.flatMap((p) => p.items) ?? [];

describe("admin caches", () => {
  it("updates the status of every report about the same target, in every queue", () => {
    const qc = new QueryClient();
    qc.setQueryData(keys.adminReports("OPEN"), queue(makeReport({ id: "1", targetId: "p1" }), makeReport({ id: "2", targetId: "p2" })));
    qc.setQueryData(keys.adminReports("DISMISSED"), queue(makeReport({ id: "3", targetId: "p1", status: "DISMISSED" })));
    setTargetStatus(qc, "POST", "p1", "HIDDEN");
    expect(items(qc, keys.adminReports("OPEN")).map((r) => r.targetStatus)).toEqual(["HIDDEN", "VISIBLE"]);
    expect(items(qc, keys.adminReports("DISMISSED"))[0]?.targetStatus).toBe("HIDDEN");
  });

  it("does not confuse a post and a person that share an id", () => {
    const qc = new QueryClient();
    qc.setQueryData(keys.adminReports("OPEN"), queue(makeReport({ id: "1", targetType: "USER", targetId: "x", targetStatus: "ACTIVE" })));
    setTargetStatus(qc, "POST", "x", "HIDDEN");
    expect(items(qc, keys.adminReports("OPEN"))[0]?.targetStatus).toBe("ACTIVE");
  });

  it("removes a resolved report from the queue at once", () => {
    const qc = new QueryClient();
    qc.setQueryData(keys.adminReports("OPEN"), queue(makeReport({ id: "1" }), makeReport({ id: "2" })));
    removeReportFromQueues(qc, "1");
    expect(items(qc, keys.adminReports("OPEN")).map((r) => r.id)).toEqual(["2"]);
  });
});

const listing = <T,>(...items: T[]) => ({ pages: [{ items, nextCursor: null }], pageParams: [undefined] });
const rows = <T,>(qc: QueryClient, key: readonly unknown[]) =>
  qc.getQueryData<ReturnType<typeof listing<T>>>(key)?.pages.flatMap((p) => p.items) ?? [];

describe("patch 14 caches", () => {
  it("removes unhidden content from the hidden lists, by type", () => {
    const qc = new QueryClient();
    qc.setQueryData(keys.adminHiddenPosts, listing(makeStaffPost({ id: "a" }), makeStaffPost({ id: "b" })));
    qc.setQueryData(keys.adminHiddenComments, listing(makeStaffComment({ id: "a" })));
    removeHiddenItem(qc, "POST", "a");
    expect(rows<{ id: string }>(qc, keys.adminHiddenPosts).map((p) => p.id)).toEqual(["b"]);
    expect(rows(qc, keys.adminHiddenComments)).toHaveLength(1);
  });

  it("shows a new author status in reports and hidden lists, and drops the person from people lists", () => {
    const qc = new QueryClient();
    qc.setQueryData(
      keys.adminReports("OPEN"),
      queue(
        makeReport({ id: "1", targetAuthorId: "u-author", targetAuthorStatus: "ACTIVE" }),
        makeReport({ id: "2", targetAuthorId: "u-other", targetAuthorStatus: "ACTIVE" }),
        makeReport({ id: "3", targetType: "USER", targetId: "u-author", targetStatus: "ACTIVE", targetAuthorId: "u-author", targetAuthorStatus: "ACTIVE" }),
      ),
    );
    qc.setQueryData(keys.adminHiddenPosts, listing(makeStaffPost({ id: "p" })));
    qc.setQueryData(keys.adminHiddenComments, listing(makeStaffComment({ id: "c" })));
    qc.setQueryData(keys.adminUsers("ACTIVE", ""), listing(makeStaffUser({ id: "u-author", status: "ACTIVE" }), makeStaffUser({ id: "u-x", status: "ACTIVE" })));

    setAuthorStatus(qc, "u-author", "SUSPENDED");

    const reports = items(qc, keys.adminReports("OPEN"));
    expect(reports.map((r) => r.targetAuthorStatus)).toEqual(["SUSPENDED", "ACTIVE", "SUSPENDED"]);
    expect(reports[2]?.targetStatus).toBe("SUSPENDED");
    expect(rows<{ authorStatus: string }>(qc, keys.adminHiddenPosts)[0]?.authorStatus).toBe("SUSPENDED");
    expect(rows<{ authorStatus: string }>(qc, keys.adminHiddenComments)[0]?.authorStatus).toBe("SUSPENDED");
    expect(rows<{ id: string }>(qc, keys.adminUsers("ACTIVE", "")).map((u) => u.id)).toEqual(["u-x"]);
  });
});
