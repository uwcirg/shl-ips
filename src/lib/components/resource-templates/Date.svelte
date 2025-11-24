<script lang=ts>
  import type { DateTimeFields } from "$lib/utils/types";
  import { formatDate } from "$lib/utils/util";

  // May need Timing support in the future
  export let fields: DateTimeFields = {};
  export let period = false;

  function buildDateString() {
    let unk = formatDate(undefined) ?? "??"; // get format function's default string if available
    let date = unk;
    let prefix = "";
    let postfix = "";
    let periodStartOnly = period;
    if (fields.period) {
      let start = formatDate(fields.period.start);
      let end = formatDate(fields.period.end);
      periodStartOnly = periodStartOnly && !fields.period.end;
      date = `${start}${fields.period.end ? ' - '+end : ""}`;
    } else if (fields.range) {
      periodStartOnly = periodStartOnly && !fields.range.high;
      date = `${fields.range.low ? fields.range.low.value + fields.range.low.unit : unk}${fields.range.high ? ` - ${fields.range.high+fields.range.high.unit}` : ''}`;
    } else if (fields.date) {
      date = formatDate(fields.date);
    } else if (fields.dateTime) {
      date = formatDate(fields.dateTime);
    } else if (fields.duration?.value) {
      date = fields.duration.value;
      prefix = fields.duration.comparator ?? "";
      postfix = fields.duration.unit ?? "";
    } else if (fields.age?.value) {
      date = fields.age.value;
      prefix = fields.age.comparator ?? "";
      postfix = fields.age.unit ?? "";
    } else if (fields.string) {
      date = formatDate(fields.string);
    } else if (fields.codeableConcept) {
      date = formatDate(
        fields.codeableConcept.text ??
        fields.codeableConcept.coding?.[0]?.display ??
        `${fields.codeableConcept.coding?.[0]?.system}|${fields.codeableConcept.coding?.[0]?.code}`
      );
    }

    if (periodStartOnly) {
      prefix = `Since ${prefix}`;
    } else if (period) {
      prefix = `From ${prefix}`;
    }

    return `${prefix}${date}${postfix}`;
  }
</script>

{buildDateString()}
