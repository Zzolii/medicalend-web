// Path: medicalend-web/app/(app)/admin/subscription-plans/page.tsx
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Layers3,
  Plus,
  RefreshCw,
  Search,
  Gift,
  CheckCircle2,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type SubscriptionPlan = {
  id: number;
  code?: string | null;
  name?: string | null;
  description?: string | null;
  price_eur?: number | null;
  duration_days?: number | null;
  is_active?: boolean;
  created_at?: string | null;
};

type CreatePlanPayload = {
  code: string;
  name: string;
  description?: string | null;
  price_eur: number;
  duration_days: number;
  is_active: boolean;
};

type UpdatePlanPayload = Partial<CreatePlanPayload>;

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function searchablePlanText(item: SubscriptionPlan) {
  return normalizeText(
    [
      item.id,
      item.code,
      item.name,
      item.description,
      item.price_eur,
      item.duration_days,
      item.is_active ? "active activ" : "inactive inactiv",
    ]
      .filter((value) => value !== null && value !== undefined)
      .join(" "),
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("ro-RO");
  } catch {
    return value;
  }
}

async function fetchPlans(token: string | null) {
  return apiRequest<SubscriptionPlan[]>("/admin/subscription-plans", { token });
}

async function createPlan(token: string | null, payload: CreatePlanPayload) {
  return apiRequest("/admin/subscription-plans", {
    method: "POST",
    token,
    body: payload,
  });
}

async function updatePlan(
  token: string | null,
  id: number,
  payload: UpdatePlanPayload,
) {
  return apiRequest(`/admin/subscription-plans/${id}`, {
    method: "PATCH",
    token,
    body: payload,
  });
}

export default function SubscriptionPlansPage() {
  const token = getToken();

  const [items, setItems] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceEur, setPriceEur] = useState("0");
  const [durationDays, setDurationDays] = useState("90");
  const [isActive, setIsActive] = useState(true);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriceEur, setEditPriceEur] = useState("0");
  const [editDurationDays, setEditDurationDays] = useState("30");
  const [editIsActive, setEditIsActive] = useState(true);

  async function load() {
    try {
      setLoading(true);
      setError("");
      const rows = await fetchPlans(token);
      setItems(rows ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Eroare la încărcarea planurilor.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filteredItems = useMemo(() => {
    const normalizedQuery = normalizeText(appliedQuery);
    if (!normalizedQuery) return items;

    return items.filter((item) =>
      searchablePlanText(item).includes(normalizedQuery),
    );
  }, [items, appliedQuery]);

  const activeCount = useMemo(
    () => items.filter((item) => item.is_active).length,
    [items],
  );

  function handleSearchSubmit(event?: FormEvent) {
    event?.preventDefault();
    setAppliedQuery(query);
  }

  function handleClearSearch() {
    setQuery("");
    setAppliedQuery("");
  }

  function resetCreateForm() {
    setCode("");
    setName("");
    setDescription("");
    setPriceEur("0");
    setDurationDays("90");
    setIsActive(true);
  }

  function openTrialPreset() {
    setCode("trial-90");
    setName("Free Trial 3 luni");
    setDescription(
      "Plan trial automat oferit clinicii la început, înainte de conversia la abonament plătit.",
    );
    setPriceEur("0");
    setDurationDays("90");
    setIsActive(true);
    setCreateOpen(true);
    closeEdit();
  }

  function openPaidPreset() {
    setCode("");
    setName("");
    setDescription("");
    setPriceEur("49");
    setDurationDays("30");
    setIsActive(true);
    setCreateOpen(true);
    closeEdit();
  }

  function openEdit(item: SubscriptionPlan) {
    setCreateOpen(false);
    setError("");
    setSuccess("");
    setEditingId(item.id);
    setEditCode(item.code || "");
    setEditName(item.name || "");
    setEditDescription(item.description || "");
    setEditPriceEur(String(item.price_eur ?? 0));
    setEditDurationDays(String(item.duration_days ?? 30));
    setEditIsActive(Boolean(item.is_active));
  }

  function closeEdit() {
    setEditingId(null);
    setEditCode("");
    setEditName("");
    setEditDescription("");
    setEditPriceEur("0");
    setEditDurationDays("30");
    setEditIsActive(true);
  }

  async function handleCreate() {
    const price = Number(priceEur);
    const duration = Number(durationDays);

    if (!code.trim()) {
      setError("Code este obligatoriu.");
      return;
    }

    if (!name.trim()) {
      setError("Numele planului este obligatoriu.");
      return;
    }

    if (Number.isNaN(price) || price < 0) {
      setError("Prețul trebuie să fie un număr valid.");
      return;
    }

    if (Number.isNaN(duration) || duration <= 0) {
      setError("Durata trebuie să fie mai mare decât 0.");
      return;
    }

    try {
      setBusy(true);
      setError("");
      setSuccess("");

      await createPlan(token, {
        code: code.trim(),
        name: name.trim(),
        description: description.trim() || null,
        price_eur: price,
        duration_days: duration,
        is_active: isActive,
      });

      setCreateOpen(false);
      resetCreateForm();
      setSuccess("Planul a fost creat.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la creare.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveEdit() {
    if (editingId === null) return;

    const price = Number(editPriceEur);
    const duration = Number(editDurationDays);

    if (!editCode.trim()) {
      setError("Code este obligatoriu.");
      return;
    }

    if (!editName.trim()) {
      setError("Numele planului este obligatoriu.");
      return;
    }

    if (Number.isNaN(price) || price < 0) {
      setError("Prețul trebuie să fie un număr valid.");
      return;
    }

    if (Number.isNaN(duration) || duration <= 0) {
      setError("Durata trebuie să fie mai mare decât 0.");
      return;
    }

    try {
      setBusy(true);
      setError("");
      setSuccess("");

      await updatePlan(token, editingId, {
        code: editCode.trim(),
        name: editName.trim(),
        description: editDescription.trim() || null,
        price_eur: price,
        duration_days: duration,
        is_active: editIsActive,
      });

      closeEdit();
      setSuccess("Planul a fost actualizat.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la actualizare.");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleActive(item: SubscriptionPlan) {
    try {
      setBusy(true);
      setError("");
      setSuccess("");

      await updatePlan(token, item.id, {
        is_active: !item.is_active,
      });

      setSuccess(
        item.is_active ? "Planul a fost dezactivat." : "Planul a fost activat.",
      );
      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Nu am putut modifica starea planului.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mc-page-shell">
      <Card
        className="mc-stat-card"
        style={{
          overflow: "hidden",
          background:
            "linear-gradient(135deg, rgba(37,99,235,0.10) 0%, rgba(255,255,255,0.96) 58%)",
        }}
      >
        <CardContent style={{ padding: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 18,
              flexWrap: "wrap",
            }}
          >
            <div style={{ maxWidth: 820 }}>
              <div
                className="mc-page-badge"
                style={{ marginBottom: 14, width: "fit-content" }}
              >
                <Layers3 size={16} style={{ marginRight: 8 }} />
                Catalogue planuri
              </div>

              <h2 style={{ margin: 0, fontSize: 32, lineHeight: 1.08 }}>
                Planuri de abonament
              </h2>

              <p
                style={{
                  margin: "14px 0 0",
                  color: "var(--mc-muted)",
                  lineHeight: 1.7,
                  maxWidth: 780,
                }}
              >
                Pregătești aici planurile care vor alimenta trialul gratuit de 3
                luni și abonamentele plătite de după trial.
              </p>
            </div>

            <div
              style={{
                minWidth: 280,
                maxWidth: 360,
                flex: 1,
                display: "grid",
                gap: 12,
              }}
            >
              <div className="mc-list-item" style={{ background: "white" }}>
                <strong>Planuri totale</strong>
                <span>{items.length}</span>
              </div>

              <div className="mc-list-item" style={{ background: "white" }}>
                <strong>Planuri active</strong>
                <span>{activeCount}</span>
              </div>

              <div className="mc-list-item" style={{ background: "white" }}>
                <strong>Rezultate filtrate</strong>
                <span>{filteredItems.length}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {error ? <p className="mc-error-banner">{error}</p> : null}

      {success ? (
        <p
          style={{
            margin: 0,
            padding: "12px 14px",
            border: "1px solid #bbf7d0",
            background: "var(--mc-success-soft)",
            borderRadius: "var(--mc-radius-md)",
            color: "#166534",
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          {success}
        </p>
      ) : null}

      <section className="mc-stats-grid">
        <Card className="mc-stat-card">
          <div className="mc-stat-top">
            <div>
              <p className="mc-stat-label">Total planuri</p>
              <p className="mc-stat-value">{items.length}</p>
            </div>
            <div className="mc-icon-badge">
              <Layers3 size={20} />
            </div>
          </div>
          <p className="mc-stat-note">Toate planurile definite în sistem.</p>
        </Card>

        <Card className="mc-stat-card">
          <div className="mc-stat-top">
            <div>
              <p className="mc-stat-label">Active</p>
              <p className="mc-stat-value">{activeCount}</p>
            </div>
            <div className="mc-icon-badge">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <p className="mc-stat-note">Planuri ce pot fi alocate clinicilor.</p>
        </Card>

        <Card className="mc-stat-card">
          <div className="mc-stat-top">
            <div>
              <p className="mc-stat-label">Preset trial</p>
              <p className="mc-stat-value">90 zile</p>
            </div>
            <div className="mc-icon-badge">
              <Gift size={20} />
            </div>
          </div>
          <p className="mc-stat-note">
            Trialul recomandat la onboarding-ul clinicii.
          </p>
        </Card>

        <Card className="mc-stat-card">
          <div className="mc-stat-top">
            <div>
              <p className="mc-stat-label">Căutare</p>
              <p className="mc-stat-value">{filteredItems.length}</p>
            </div>
            <div className="mc-icon-badge">
              <Search size={20} />
            </div>
          </div>
          <p className="mc-stat-note">
            Rezultate care corespund filtrului activ.
          </p>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Acțiuni</CardTitle>
          <CardDescription>
            Creează trialul implicit sau adaugă alte planuri comerciale.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div style={{ display: "grid", gap: 14 }}>
            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <Button onClick={openTrialPreset} disabled={busy}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Gift size={16} />
                  Creează preset trial 3 luni
                </span>
              </Button>

              <Button
                variant="secondary"
                onClick={openPaidPreset}
                disabled={busy}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Plus size={16} />
                  Adaugă plan plătit
                </span>
              </Button>

              <Button
                variant="secondary"
                onClick={() => void load()}
                disabled={busy}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <RefreshCw size={16} />
                  Reîncarcă
                </span>
              </Button>
            </div>

            <form onSubmit={handleSearchSubmit} style={{ maxWidth: 760 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) auto auto",
                  gap: 12,
                  alignItems: "end",
                }}
              >
                <Input
                  id="plans-search"
                  label="Căutare"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ex: trial, starter, monthly, annual..."
                />

                <Button type="submit">
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Search size={16} />
                    Caută
                  </span>
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleClearSearch}
                  disabled={!query && !appliedQuery}
                >
                  Resetează
                </Button>
              </div>
            </form>

            {appliedQuery ? (
              <p className="mc-empty-note" style={{ margin: 0 }}>
                Filtru activ: <strong>{appliedQuery}</strong>
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {createOpen ? (
        <Card>
          <CardHeader>
            <CardTitle>Plan nou</CardTitle>
            <CardDescription>
              Definește un plan nou pentru trial sau pentru etapa plătită.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="mc-form-grid-2">
              <Input
                id="plan-code"
                label="Code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />

              <Input
                id="plan-name"
                label="Nume"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <div className="mc-grid-span-2">
                <Input
                  id="plan-description"
                  label="Descriere"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <Input
                id="plan-price"
                label="Preț EUR"
                value={priceEur}
                onChange={(e) => setPriceEur(e.target.value)}
              />

              <Input
                id="plan-duration"
                label="Durată zile"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
              />

              <div>
                <label className="mc-label" htmlFor="plan-active">
                  Activ
                </label>
                <select
                  id="plan-active"
                  className="mc-input"
                  value={isActive ? "yes" : "no"}
                  onChange={(e) => setIsActive(e.target.value === "yes")}
                >
                  <option value="yes">Da</option>
                  <option value="no">Nu</option>
                </select>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 16,
                flexWrap: "wrap",
              }}
            >
              <Button onClick={handleCreate} disabled={busy}>
                {busy ? "Se salvează..." : "Salvează planul"}
              </Button>

              <Button
                variant="secondary"
                onClick={() => {
                  setCreateOpen(false);
                  resetCreateForm();
                }}
                disabled={busy}
              >
                Renunță
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Planurile existente</CardTitle>
          <CardDescription>
            Catalogul de planuri utilizabile pentru trial și abonamentele
            plătite.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {loading ? <p className="mc-empty-note">Se încarcă...</p> : null}

          {!loading && filteredItems.length === 0 ? (
            <p className="mc-empty-note">
              Nu există planuri pentru filtrul curent.
            </p>
          ) : null}

          {!loading && filteredItems.length > 0 ? (
            <div className="mc-list">
              {filteredItems.map((item) => {
                const isEditing = editingId === item.id;

                return (
                  <Card key={item.id}>
                    <CardContent>
                      <div className="mc-list-item" style={{ gap: 14 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            flexWrap: "wrap",
                          }}
                        >
                          <div>
                            <strong>{item.name || `Plan #${item.id}`}</strong>
                            <span>{item.code || "fără cod"}</span>
                          </div>

                          <span
                            className={
                              item.is_active
                                ? "mc-pill mc-pill-success"
                                : "mc-pill mc-pill-neutral"
                            }
                          >
                            {item.is_active ? "Activ" : "Inactiv"}
                          </span>
                        </div>

                        <div className="mc-muted-block">
                          <div>
                            <strong>Descriere:</strong>{" "}
                            {item.description || "-"}
                          </div>
                          <div>
                            <strong>Preț:</strong>{" "}
                            {item.price_eur != null
                              ? `${item.price_eur} EUR`
                              : "-"}
                          </div>
                          <div>
                            <strong>Durată:</strong>{" "}
                            {item.duration_days != null
                              ? `${item.duration_days} zile`
                              : "-"}
                          </div>
                          <div>
                            <strong>Creat la:</strong>{" "}
                            {formatDateTime(item.created_at)}
                          </div>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: 10,
                            flexWrap: "wrap",
                          }}
                        >
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => openEdit(item)}
                            disabled={busy}
                          >
                            Editează
                          </Button>

                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => handleToggleActive(item)}
                            disabled={busy}
                          >
                            {item.is_active ? "Dezactivează" : "Activează"}
                          </Button>
                        </div>

                        {isEditing ? (
                          <div className="mc-inline-form">
                            <div className="mc-form-grid-2">
                              <Input
                                id={`edit-plan-code-${item.id}`}
                                label="Code"
                                value={editCode}
                                onChange={(e) => setEditCode(e.target.value)}
                              />

                              <Input
                                id={`edit-plan-name-${item.id}`}
                                label="Nume"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                              />

                              <div className="mc-grid-span-2">
                                <Input
                                  id={`edit-plan-description-${item.id}`}
                                  label="Descriere"
                                  value={editDescription}
                                  onChange={(e) =>
                                    setEditDescription(e.target.value)
                                  }
                                />
                              </div>

                              <Input
                                id={`edit-plan-price-${item.id}`}
                                label="Preț EUR"
                                value={editPriceEur}
                                onChange={(e) =>
                                  setEditPriceEur(e.target.value)
                                }
                              />

                              <Input
                                id={`edit-plan-duration-${item.id}`}
                                label="Durată zile"
                                value={editDurationDays}
                                onChange={(e) =>
                                  setEditDurationDays(e.target.value)
                                }
                              />

                              <div>
                                <label
                                  className="mc-label"
                                  htmlFor={`edit-plan-active-${item.id}`}
                                >
                                  Activ
                                </label>
                                <select
                                  id={`edit-plan-active-${item.id}`}
                                  className="mc-input"
                                  value={editIsActive ? "yes" : "no"}
                                  onChange={(e) =>
                                    setEditIsActive(e.target.value === "yes")
                                  }
                                >
                                  <option value="yes">Da</option>
                                  <option value="no">Nu</option>
                                </select>
                              </div>
                            </div>

                            <div
                              style={{
                                display: "flex",
                                gap: 12,
                                marginTop: 16,
                                flexWrap: "wrap",
                              }}
                            >
                              <Button onClick={handleSaveEdit} disabled={busy}>
                                {busy
                                  ? "Se salvează..."
                                  : "Salvează modificările"}
                              </Button>

                              <Button
                                variant="secondary"
                                onClick={closeEdit}
                                disabled={busy}
                              >
                                Închide
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
