import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import {
  Anchor,
  CalendarDays,
  ChevronDown,
  Clock,
  Download,
  Filter,
  MapPin,
  RefreshCw,
  Ship,
  Timer,
} from "lucide-react";
import { useNavigate } from "react-router-dom"; // <-- TAMBAHKAN INI
import GclLayout from "../layouts/GclLayout";
import { getExportSchedule, getImportSchedule } from "../api/schedule";
import NewBookingModal from "./NewBookingModal";
import { apiFetch } from "../utils/authApi";

function clsx(...a) {
  return a.filter(Boolean).join(" ");
}

function clean(v, fallback = "-") {
  const s = String(v ?? "").trim();

  if (!s || s === "0000-00-00" || s.toLowerCase() === "null") {
    return fallback;
  }

  return s.replace(/\s+/g, " ").trim();
}

function joinVesselVoyage(vessel, voyage) {
  const v = clean(vessel, "");
  const voy = clean(voyage, "");

  if (!v && !voy) return "TBA";
  if (!v) return voy;
  if (!voy || voy === "TBA") return v;

  return `${v} ${voy}`.replace(/\s+/g, " ").trim();
}

function isValidDate(v) {
  const s = clean(v, "");
  if (!s) return false;

  const d = new Date(`${s}T00:00:00`);
  return !Number.isNaN(d.getTime());
}

function dateValue(v) {
  if (!isValidDate(v)) return 0;
  return new Date(`${v}T00:00:00`).getTime();
}

function formatDate(v) {
  if (!isValidDate(v)) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${v}T00:00:00`));
}

function daysFromToday(v) {
  if (!isValidDate(v)) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(`${v}T00:00:00`);
  target.setHours(0, 0, 0, 0);

  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function dateBadgeTone(v) {
  const diff = daysFromToday(v);

  if (diff === null) return "bg-white/10 text-slate-300 border-white/10";
  if (diff < 0) return "bg-rose-500/15 text-rose-300 border-rose-400/30";
  if (diff <= 3) return "bg-amber-500/15 text-amber-300 border-amber-400/30";
  return "bg-emerald-500/15 text-emerald-300 border-emerald-400/30";
}

function getScheduleGroupsFromResponse(json) {
  const data = Array.isArray(json?.data) ? json.data : [];

  const direct = [];
  const via = [];

  data.forEach((group) => {
    if (Array.isArray(group?.direct)) {
      direct.push(...group.direct);
    }

    if (Array.isArray(group?.via)) {
      via.push(...group.via);
    }
  });

  return {
    direct,
    via,
  };
}

function routeKey(row) {
  const origin = clean(row.origin_name, "-").toUpperCase();
  const dest = clean(row.destination_name || row.region_id, "-").toUpperCase();

  // Khusus export via: ORIGIN - VIA - DESTINATION
  if (row.type === "export" && row.service === "via") {
    const via = clean(row.via_port, "").toUpperCase();

    if (via && via !== "-") {
      return `${origin} - ${via} - ${dest}`;
    }
  }

  return `${origin} - ${dest}`;
}

function groupRowsByRoute(rows) {
  const map = new Map();

  rows.forEach((row) => {
    const key = routeKey(row);

    if (!map.has(key)) {
      map.set(key, []);
    }

    map.get(key).push(row);
  });

  return Array.from(map.entries())
    .map(([route, items]) => ({
      route,
      rows: items.slice().sort((a, b) => dateValue(a.etd) - dateValue(b.etd)),
    }))
    .sort((a, b) => a.route.localeCompare(b.route));
}

function normalizeExportDirectRow(row, index) {
  return {
    id: `export-direct-${index}`,
    type: "export",
    service: "direct",

    carrier: clean(row.carrier, "TBA"),
    vessel_voyage: joinVesselVoyage(row.vessel, row.voyage),

    closing_date: clean(row.closing_date, ""),
    stuffing_date: clean(row.stuffing_date, ""),
    stuffing_location: clean(row.stuffing_location, "-"),

    etd: clean(row.etd, ""),
    eta: clean(row.eta, ""),

    origin_name: clean(row.origin_name, "-").toUpperCase(),
    destination_name: clean(row.destination_name, "-").toUpperCase(),
    destination_id: clean(row.destination_id, "-").toUpperCase(),

    raw: row,
  };
}

function normalizeExportViaRow(row, index) {
  return {
    id: `export-via-${index}`,
    type: "export",
    service: "via",

    carrier: clean(row.carrier, "TBA"),

    /**
     * Untuk export via, API biasanya punya:
     * vessel + voy_vessel untuk first leg
     * connecting_vessel + voy_con untuk connecting leg
     */
    vessel_voyage: joinVesselVoyage(row.vessel, row.voy_vessel || row.voyage),

    closing_date: clean(row.stf_cls || row.closing_date, ""),
    stuffing_date: clean(row.stuffing_date, ""),
    stuffing_location: clean(row.stuffing_location, "-"),

    etd: clean(row.etd_jkt || row.etd, ""),
    eta: clean(row.eta, ""),

    connecting_vessel_voyage: joinVesselVoyage(
      row.connecting_vessel,
      row.voy_con
    ),
    etd_con: clean(row.etd_con, ""),
    via_port: clean(
      row.etd_city_con_name || row.etd_city_con_id || row.via_port,
      "-"
    ).toUpperCase(),

    origin_name: clean(row.origin_name, "-").toUpperCase(),
    destination_name: clean(row.destination_name, "-").toUpperCase(),
    destination_id: clean(row.destination_id, "-").toUpperCase(),

    raw: row,
  };
}

function normalizeImportDirectRow(row, index) {
  return {
    id: `import-direct-${index}`,
    type: "import",
    service: "direct",

    // Import tidak pakai carrier
    carrier: "",
    vessel_voyage: joinVesselVoyage(row.vessel, row.voyage),

    closing_date: clean(row.closing_date, ""),
    stuffing_date: "",
    stuffing_location: "-",

    etd: clean(row.etd, ""),
    eta: clean(row.eta, ""),

    origin_name: clean(row.origin_name, "-").toUpperCase(),
    origin_id: clean(row.origin_id, "-").toUpperCase(),

    // region_id dipakai sebagai destination dan uppercase
    destination_name: clean(row.destination_name || row.region_id, "-").toUpperCase(),
    region_id: clean(row.region_id, "-").toUpperCase(),

    raw: row,
  };
}

function SelectField({ label, value, onChange, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
        {label}
      </span>

      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full appearance-none rounded-2xl border border-white/10 bg-slate-950/60 px-4 pr-10 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/10"
        >
          {children}
        </select>

        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </label>
  );
}

function InputField({ label, type = "text", value, onChange, placeholder }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
        {label}
      </span>

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/10"
      />
    </label>
  );
}

function SummaryCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
            {label}
          </p>

          <h3 className="mt-3 text-2xl font-semibold text-white">{value}</h3>

          {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
        </div>

        <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-cyan-200">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-bold transition",
        active
          ? "bg-cyan-300 text-slate-950"
          : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

function ScheduleCard({ row, onBook }) {
  const isImport = row.type === "import";
  const isVia = row.service === "via";

  return (
    <div className="rounded-[28px] border border-white/10 bg-slate-950/40 p-5 shadow-xl shadow-black/20">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Ship className="h-4 w-4 text-cyan-200" />
            <h3 className="text-lg font-semibold text-white">
              {row.vessel_voyage}
            </h3>
          </div>

          {!isImport ? (
            <p className="mt-1 text-sm text-slate-400">{row.carrier}</p>
          ) : null}
        </div>

        <div className="flex flex-col items-end gap-2">
            {!isImport ? (
                <span
                className={clsx(
                    "rounded-full border px-3 py-1 text-xs font-bold",
                    isVia
                    ? "border-violet-300/30 bg-violet-300/10 text-violet-200"
                    : "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
                )}
                >
                {isVia ? "VIA" : "DIRECT"}
                </span>
            ) : null}

            <div
                className={clsx(
                "rounded-full border px-3 py-1 text-xs font-bold",
                dateBadgeTone(row.closing_date)
                )}
            >
                Closing {formatDate(row.closing_date)}
            </div>
            </div>
      </div>

      <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
              Origin
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              {row.origin_name}
            </p>
          </div>

          <div className="h-[1px] flex-1 bg-white/10" />

          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
              Destination
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              {row.destination_name}
            </p>
          </div>
        </div>
      </div>

      {isVia ? (
        <div className="mb-4 rounded-2xl border border-cyan-300/10 bg-cyan-300/5 p-3">
          <p className="text-[10px] uppercase tracking-wider text-cyan-300">
            Via
          </p>
          <p className="mt-1 text-sm font-semibold text-white">{row.via_port}</p>
          <p className="text-xs text-slate-400">
            {row.connecting_vessel_voyage}
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-2xl bg-white/[0.04] p-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            {isVia ? "ETD Origin" : "ETD"}
          </p>
          <p className="mt-1 font-semibold text-slate-100">
            {formatDate(row.etd)}
          </p>
        </div>

        <div className="rounded-2xl bg-white/[0.04] p-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            ETA
          </p>
          <p className="mt-1 font-semibold text-slate-100">
            {formatDate(row.eta)}
          </p>
        </div>

        <div className="rounded-2xl bg-white/[0.04] p-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            {isImport ? "Closing" : "Stuffing"}
          </p>
          <p className="mt-1 font-semibold text-slate-100">
            {isImport ? formatDate(row.closing_date) : formatDate(row.stuffing_date)}
          </p>
        </div>
      </div>

      {!isImport ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-400">
          Stuffing Location:{" "}
          <span className="font-semibold text-slate-200">
            {row.stuffing_location}
          </span>
        </div>
      ) : null}

      {/* Button Booking */}
      <button
        onClick={() => onBook(row)}
        className="mt-4 w-full rounded-xl bg-cyan-400 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
      >
        Book Now
      </button>
    </div>
  );
}

function ScheduleTable({ rows, mode, onBook }) {
  const groups = groupRowsByRoute(rows);
  const isImport = mode === "import";

  if (groups.length === 0) {
    return (
      <div className="rounded-[26px] border border-dashed border-white/15 p-10 text-center text-sm text-slate-400">
        No schedule found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const firstRow = group.rows?.[0] || {};
        const isViaGroup = !isImport && firstRow.service === "via";
        const isDirectGroup = !isImport && firstRow.service === "direct";

        return (
          <div
            key={group.route}
            className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/30"
          >
            <div className="flex flex-col gap-1 border-b border-white/10 bg-white/[0.06] px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-black uppercase tracking-wide text-white">
                  {group.route}
                </h3>

                <p className="text-xs text-slate-400">
                  {group.rows.length.toLocaleString("id-ID")} schedules
                </p>
              </div>

              <div
                className={clsx(
                  "rounded-full border px-4 py-1.5 text-xs font-bold",
                  isImport
                    ? "border-cyan-300/20 bg-cyan-300/10 text-cyan-200"
                    : isViaGroup
                      ? "border-violet-300/30 bg-violet-300/10 text-violet-200"
                      : "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
                )}
              >
                {isImport ? "IMPORT" : isViaGroup ? "EXPORT VIA" : "EXPORT DIRECT"}
              </div>
            </div>

            <div className="overflow-x-auto">
              {isImport ? (
                <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                  <thead className="bg-slate-950/80 text-xs uppercase tracking-[0.18em] text-slate-400">
                    <tr>
                      <th className="px-4 py-4">Vessel / Voyage</th>
                      <th className="px-4 py-4">Closing</th>
                      <th className="px-4 py-4">ETD</th>
                      <th className="px-4 py-4">ETA</th>
                      <th className="px-4 py-4 text-right">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {group.rows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-t border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                      >
                        <td className="px-4 py-4">
                          <div className="font-semibold text-white">
                            {row.vessel_voyage}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={clsx(
                              "rounded-full border px-3 py-1 text-xs",
                              dateBadgeTone(row.closing_date)
                            )}
                          >
                            {formatDate(row.closing_date)}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-slate-300">
                          {formatDate(row.etd)}
                        </td>

                        <td className="px-4 py-4 text-slate-300">
                          {formatDate(row.eta)}
                        </td>

                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => onBook(row)}
                            className="rounded-xl bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-300"
                          >
                            Book
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : isDirectGroup ? (
                <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
                  <thead className="bg-slate-950/80 text-xs uppercase tracking-[0.18em] text-slate-400">
                    <tr>
                      <th className="px-4 py-4">Carrier</th>
                      <th className="px-4 py-4">Vessel / Voyage</th>
                      <th className="px-4 py-4">Closing</th>
                      <th className="px-4 py-4">Stuffing</th>
                      <th className="px-4 py-4">Stuffing Location</th>
                      <th className="px-4 py-4">ETD Origin</th>
                      <th className="px-4 py-4">ETA</th>
                      <th className="px-4 py-4 text-right">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {group.rows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-t border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                      >
                        <td className="px-4 py-4 text-slate-300">
                          {row.carrier}
                        </td>

                        <td className="px-4 py-4">
                          <div className="font-semibold text-white">
                            {row.vessel_voyage}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={clsx(
                              "rounded-full border px-3 py-1 text-xs",
                              dateBadgeTone(row.closing_date)
                            )}
                          >
                            {formatDate(row.closing_date)}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-slate-300">
                          {formatDate(row.stuffing_date)}
                        </td>

                        <td className="px-4 py-4 text-slate-300">
                          {row.stuffing_location}
                        </td>

                        <td className="px-4 py-4 text-slate-300">
                          {formatDate(row.etd)}
                        </td>

                        <td className="px-4 py-4 text-slate-300">
                          {formatDate(row.eta)}
                        </td>

                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => onBook(row)}
                            className="rounded-xl bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-300"
                          >
                            Book
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full min-w-[1250px] border-collapse text-left text-sm">
                  <thead className="bg-slate-950/80 text-xs uppercase tracking-[0.18em] text-slate-400">
                    <tr>
                      <th className="px-4 py-4">Carrier</th>
                      <th className="px-4 py-4">Vessel / Voyage</th>
                      <th className="px-4 py-4">Closing</th>
                      <th className="px-4 py-4">Stuffing</th>
                      <th className="px-4 py-4">Stuffing Location</th>
                      <th className="px-4 py-4">ETD Origin</th>
                      <th className="px-4 py-4">ETD Via</th>
                      <th className="px-4 py-4">Connecting</th>
                      <th className="px-4 py-4">ETA</th>
                      <th className="px-4 py-4 text-right">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {group.rows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-t border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                      >
                        <td className="px-4 py-4 text-slate-300">
                          {row.carrier}
                        </td>

                        <td className="px-4 py-4">
                          <div className="font-semibold text-white">
                            {row.vessel_voyage}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={clsx(
                              "rounded-full border px-3 py-1 text-xs",
                              dateBadgeTone(row.closing_date)
                            )}
                          >
                            {formatDate(row.closing_date)}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-slate-300">
                          {formatDate(row.stuffing_date)}
                        </td>

                        <td className="px-4 py-4 text-slate-300">
                          {row.stuffing_location}
                        </td>

                        <td className="px-4 py-4 text-slate-300">
                          {formatDate(row.etd)}
                        </td>

                        <td className="px-4 py-4 text-slate-300">
                          {formatDate(row.etd_con)}
                        </td>

                        <td className="px-4 py-4">
                          <div className="font-semibold text-slate-100">
                            {row.via_port}
                          </div>

                          <div className="mt-1 text-xs text-slate-400">
                            {row.connecting_vessel_voyage}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-slate-300">
                          {formatDate(row.eta)}
                        </td>

                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => onBook(row)}
                            className="rounded-xl bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-300"
                          >
                            Book
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function SchedulePage() {
  const navigate = useNavigate(); // <-- TAMBAHKAN INI
  const [mode, setMode] = useState("export");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [exportDirectRows, setExportDirectRows] = useState([]);
  const [exportViaRows, setExportViaRows] = useState([]);
  const [importRows, setImportRows] = useState([]);

  const [view, setView] = useState("table");
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [etd, setEtd] = useState("");
  const [sortBy, setSortBy] = useState("etd_asc");

  // State Modal Booking
  const [showModal, setShowModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  const activeRows = useMemo(() => {
    if (mode === "export") {
        return [...exportDirectRows, ...exportViaRows];
    }

    return importRows;
    }, [mode, exportDirectRows, exportViaRows, importRows]);

  const destinationOptions = useMemo(() => {
    const values = new Set();

    [...exportDirectRows, ...exportViaRows].forEach((r) => {
        if (r.destination_name && r.destination_name !== "-") {
        values.add(r.destination_name);
        }

        // Tambahkan via port sebagai opsi filter juga
        if (r.service === "via" && r.via_port && r.via_port !== "-") {
        values.add(r.via_port);
        }
    });

    return Array.from(values).sort();
    }, [exportDirectRows, exportViaRows]);

  const originOptions = useMemo(() => {
    const values = new Set();

    importRows.forEach((r) => {
      if (r.origin_name && r.origin_name !== "-") {
        values.add(r.origin_name);
      }
    });

    return Array.from(values).sort();
  }, [importRows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    let rows = activeRows.filter((row) => {
      const haystack = [
        row.carrier,
        row.vessel_voyage,
        row.connecting_vessel_voyage,
        row.via_port,
        row.origin_name,
        row.destination_name,
        row.destination_id,
        row.origin_id,
        row.region_id,
        row.stuffing_location,
      ]
        .join(" ")
        .toLowerCase();

      if (q && !haystack.includes(q)) return false;

      if (mode === "export" && city) {
        const cityText = [
            row.destination_name,
            row.destination_id,
            row.via_port,
        ]
            .join(" ")
            .toLowerCase();

        if (!cityText.includes(city.toLowerCase())) return false;
        }

      if (mode === "import" && city) {
        const cityText = `${row.origin_name} ${row.origin_id}`.toLowerCase();
        if (!cityText.includes(city.toLowerCase())) return false;
      }

      if (etd && row.etd !== etd) return false;

      return true;
    });

    rows = rows.slice().sort((a, b) => {
      if (sortBy === "etd_asc") return dateValue(a.etd) - dateValue(b.etd);
      if (sortBy === "etd_desc") return dateValue(b.etd) - dateValue(a.etd);
      if (sortBy === "closing_asc") {
        return dateValue(a.closing_date) - dateValue(b.closing_date);
      }
      if (sortBy === "closing_desc") {
        return dateValue(b.closing_date) - dateValue(a.closing_date);
      }
      if (sortBy === "vessel_asc") {
        return a.vessel_voyage.localeCompare(b.vessel_voyage);
      }

      return 0;
    });

    return rows;
  }, [activeRows, search, city, etd, mode, sortBy]);

  const summary = useMemo(() => {
    const rows = filteredRows;

    const uniquePorts = new Set();

    const urgentClosing = rows.filter((r) => {
      const d = daysFromToday(r.closing_date);
      return d !== null && d >= 0 && d <= 3;
    }).length;

    rows.forEach((r) => {
      if (mode === "import") uniquePorts.add(r.origin_name);
      else uniquePorts.add(r.destination_name);
    });

    const nextEtd = rows
      .filter((r) => isValidDate(r.etd))
      .slice()
      .sort((a, b) => dateValue(a.etd) - dateValue(b.etd))[0]?.etd;

    return {
      total: rows.length,
      uniquePorts: uniquePorts.size,
      urgentClosing,
      nextEtd,
    };
  }, [filteredRows, mode]);

  async function loadSchedules(targetMode = mode) {
    try {
        setLoading(true);
        setErr("");

        if (targetMode === "export") {
        const json = await getExportSchedule({
            city,
            etd,
        });

        if (json?.error) {
            throw new Error(json?.message || "Failed to load export schedule");
        }

        const groups = getScheduleGroupsFromResponse(json);

        setExportDirectRows(groups.direct.map(normalizeExportDirectRow));
        setExportViaRows(groups.via.map(normalizeExportViaRow));
        } else {
        const json = await getImportSchedule();

        if (json?.error) {
            throw new Error(json?.message || "Failed to load import schedule");
        }

        const groups = getScheduleGroupsFromResponse(json);
        setImportRows(groups.direct.map(normalizeImportDirectRow));
        }
    } catch (e) {
        setErr(e?.message || "Failed to load schedule");
    } finally {
        setLoading(false);
    }
    }
  function switchMode(nextMode) {
    setMode(nextMode);
    setSearch("");
    setCity("");
    setEtd("");

    if (
        nextMode === "export" &&
        exportDirectRows.length === 0 &&
        exportViaRows.length === 0
    ) {
        loadSchedules("export");
    }

    if (nextMode === "import" && importRows.length === 0) {
        loadSchedules("import");
    }
    }

  function exportCsv() {
    const headers =
  mode === "import"
    ? [
        "service",
        "vessel_voyage",
        "origin_name",
        "destination_name",
        "closing_date",
        "etd",
        "eta",
      ]
    : [
        "service",
        "carrier",
        "vessel_voyage",
        "origin_name",
        "via_port",
        "destination_name",
        "closing_date",
        "stuffing_date",
        "stuffing_location",
        "etd",
        "connecting_vessel_voyage",
        "etd_con",
        "eta",
      ];

    const csvRows = [
      headers.join(","),
      ...filteredRows.map((row) =>
        headers
          .map((h) => {
            const value = String(row[h] ?? "").replace(/"/g, '""');
            return `"${value}"`;
          })
          .join(",")
      ),
    ];

    const blob = new Blob([csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${mode}-schedule.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // --- HANDLER: BUKA MODAL DARI TOMBOL BOOK ---
  const handleBook = (row) => {
    // GEMBOK LAPIS 1: Cek Token
    const token = localStorage.getItem("gcl_access_token");
    if (!token) {
      // Lempar ke login dan hentikan eksekusi!
      navigate("/login");
      return; 
    }

    // Jika sudah login, lanjut buka form
    const isVia = row.service === "via";
    const raw = row.raw;

    const scheduleData = {
        isFromSchedule: true,
        
        vessel: raw.vessel || "", 
        voy_vessel: raw.voy_vessel || "", 
        connecting_vessel: raw.connecting_vessel || "", 
        
        voyage: raw.voyage || "",
        voy_con: raw.voy_con || "", 

        etd_jkt: isVia ? (raw.etd_jkt || raw.etd) : raw.etd, 
        eta: raw.eta,
        closing_date: isVia ? (raw.stf_cls || raw.closing_date) : raw.closing_date,

        origin_city: row.origin_name,
        destination_city: row.destination_name,
        trans_city: isVia ? row.via_port : "",

        route_type: isVia ? "VIA" : "DIRECT"
    };

    setSelectedSchedule(scheduleData);
    setShowModal(true);
  };

  /// --- HANDLER: SUBMIT BOOKING KE API ---
const handleSubmitBooking = async (formData) => {
  Swal.fire({
    title: "Saving Booking...",
    text: "Sending data to Gateway server",
    allowOutsideClick: false,
    background: "#0f172a",
    color: "#f8fafc",
    didOpen: () => Swal.showLoading(),
  });

  try {
    const token = localStorage.getItem("gcl_access_token");
    if (!token) throw new Error("Please login first.");

    const payload = new URLSearchParams();

    Object.keys(formData).forEach((key) => {
      const val =
        formData[key] === null || formData[key] === undefined
          ? ""
          : formData[key];

      payload.append(key, val);
    });

    payload.append(
      "user_first_name",
      localStorage.getItem("username") || "User App"
    );

    if (!formData.origin_country) {
      payload.append("origin_country", "INDONESIA");
    }

    // apiFetch langsung return JSON, jangan pakai response.json()
    const json = await apiFetch("/instant_booking", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: payload,
    });

    console.log("instant_booking response:", json);

    const isSuccess =
      json?.error === 0 ||
      Number(json?.status) === 201 ||
      json?.status === true ||
      json?.status === "success";

    if (!isSuccess) {
      throw new Error(json?.message || "Failed to save booking.");
    }

    await Swal.fire({
      icon: "success",
      title: "Booking Created!",
      text: json.message || "Booking successfully saved.",
      background: "#0f172a",
      color: "#f8fafc",
      confirmButtonColor: "#22d3ee",
    });

    setShowModal(false);
    setSelectedSchedule(null);
  } catch (error) {
    console.error("Submit Error:", error);

    Swal.fire({
      icon: "error",
      title: "Failed",
      text: error.message || "Something went wrong.",
      background: "#0f172a",
      color: "#f8fafc",
      confirmButtonColor: "#ef4444",
    });
  }
};


  useEffect(() => {
    loadSchedules("export");
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

  const pageTitle = mode === "export" ? "Export Schedule" : "Import Schedule";

  const portFilterLabel = mode === "import" ? "Origin" : "Destination";
  const portOptions = mode === "import" ? originOptions : destinationOptions;

  // <-- TAMBAHKAN INI DI SINI
  const isLoggedIn = !!localStorage.getItem("gcl_access_token");

  return (
    <GclLayout>
    <div className="h-full overflow-y-auto bg-transparent p-4 text-slate-100 md:p-6">
      <div className="mx-auto max-w-full">
        <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-transparent p-5 shadow-2xl shadow-black/30 md:p-7">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative z-10">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-medium text-cyan-200">
                  <Ship className="h-4 w-4" />
                  Gateway Shipping Schedule
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                  Schedule Export & Import
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                  Browse export direct, export via, and import vessel schedule
                  grouped by route.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={exportCsv}
                  disabled={filteredRows.length === 0}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 text-sm font-medium text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  CSV
                </button>

                <button
                  type="button"
                  onClick={() => loadSchedules(mode)}
                  disabled={loading}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 text-sm font-medium text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    className={clsx("h-4 w-4", loading && "animate-spin")}
                  />
                  Refresh
                </button>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <TabButton
                active={mode === "export"}
                onClick={() => switchMode("export")}
                icon={Anchor}
                >
                Export
                </TabButton>

                <TabButton
                active={mode === "import"}
                onClick={() => switchMode("import")}
                icon={Ship}
                >
                Import
                </TabButton>
            </div>

            <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.05] p-4 backdrop-blur-xl">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
                <Filter className="h-4 w-4 text-cyan-200" />
                Filters
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <InputField
                  label="Search"
                  value={search}
                  placeholder="Vessel, voyage, port, carrier..."
                  onChange={setSearch}
                />

                <SelectField
                  label={portFilterLabel}
                  value={city}
                  onChange={setCity}
                >
                  <option value="">All</option>
                  {portOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </SelectField>

                <InputField
                  label="ETD"
                  type="date"
                  value={etd}
                  onChange={setEtd}
                />

                <SelectField label="Sort By" value={sortBy} onChange={setSortBy}>
                  <option value="etd_asc">ETD Ascending</option>
                  <option value="etd_desc">ETD Descending</option>
                  <option value="closing_asc">Closing Ascending</option>
                  <option value="closing_desc">Closing Descending</option>
                  <option value="vessel_asc">Vessel A-Z</option>
                </SelectField>

                <SelectField label="View" value={view} onChange={setView}>
                  <option value="table">Table</option>
                  <option value="card">Card</option>
                </SelectField>
              </div>
            </div>

            {err ? (
              <div className="mt-5 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">
                {err}
              </div>
            ) : null}

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                icon={Ship}
                label="Total Schedule"
                value={summary.total.toLocaleString("id-ID")}
                hint={mode === "export" ? "Export direct + via rows" : "Import rows"}
              />

              <SummaryCard
                icon={MapPin}
                label={mode === "import" ? "Origins" : "Destinations"}
                value={summary.uniquePorts.toLocaleString("id-ID")}
                hint="Unique ports"
              />

              <SummaryCard
                icon={Timer}
                label="Urgent Closing"
                value={summary.urgentClosing.toLocaleString("id-ID")}
                hint="Closing within 3 days"
              />

              <SummaryCard
                icon={CalendarDays}
                label="Next ETD"
                value={formatDate(summary.nextEtd)}
                hint="Earliest departure"
              />
            </div>

            <div className="mt-6 rounded-[32px] border border-white/10 bg-white/[0.05] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    {pageTitle}
                  </h2>
                  <p className="text-sm text-slate-400">
                    Showing {filteredRows.length.toLocaleString("id-ID")} rows.
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs text-slate-300">
                  <Clock className="h-4 w-4 text-cyan-200" />
                  Latest Shipping Schedule Updates
                </div>
              </div>

              {loading ? (
                <div className="grid gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-24 animate-pulse rounded-[26px] bg-white/10"
                    />
                  ))}
                </div>
              ) : view === "card" ? (
                filteredRows.length === 0 ? (
                  <div className="rounded-[26px] border border-dashed border-white/15 p-10 text-center text-sm text-slate-400">
                    No schedule found.
                  </div>
                ) : (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {filteredRows.map((row) => (
                      <ScheduleCard key={row.id} row={row} onBook={handleBook} />
                    ))}
                  </div>
                )
              ) : (
                <ScheduleTable rows={filteredRows} mode={mode} onBook={handleBook} />
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Component Modal New Booking */}
      {showModal && isLoggedIn && (
        <NewBookingModal 
          open={showModal}
          onClose={() => {
              setShowModal(false);
              setSelectedSchedule(null);
          }}
          onSubmit={handleSubmitBooking}
          initialData={selectedSchedule}
        />
      )}

    </div>
    </GclLayout>
  );
}