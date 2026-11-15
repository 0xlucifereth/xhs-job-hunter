import type { JobNote, TableRow } from '../types.js';
export declare const TABLE_COLUMNS: readonly [{
    readonly key: "region";
    readonly label: "地区";
    readonly type: "string";
    readonly width: 10;
}, {
    readonly key: "job";
    readonly label: "岗位";
    readonly type: "string";
    readonly width: 12;
}, {
    readonly key: "title";
    readonly label: "标题";
    readonly type: "string";
    readonly width: 42;
}, {
    readonly key: "url";
    readonly label: "链接";
    readonly type: "string";
    readonly width: 58;
}, {
    readonly key: "publishedDate";
    readonly label: "发布日期";
    readonly type: "date";
    readonly width: 14;
}, {
    readonly key: "summary";
    readonly label: "正文摘要";
    readonly type: "string";
    readonly width: 64;
}, {
    readonly key: "author";
    readonly label: "作者";
    readonly type: "string";
    readonly width: 18;
}];
export declare function noteToRow(note: JobNote): TableRow;
export declare function notesToRows(notes: readonly JobNote[]): TableRow[];
//# sourceMappingURL=columns.d.ts.map