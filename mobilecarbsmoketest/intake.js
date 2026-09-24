(() => {
  const form = document.querySelector("[data-intake-form]");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (form.elements.company && form.elements.company.value) {
      window.location.href = "/thank-you/";
      return;
    }

    const data = new FormData(form);
    const lines = [
      "[LEAD][smoke_sd] Mobile CARB Smoke Test (San Diego)",
      "Source: mobilecarbsmoketest.com",
      "Price card: OBD $119 · OVI $219 (SD only — do NOT quote NorCal $75/$199)",
      "Handle: same as NorCal — call/text, lock day/time, book. Only prices differ.",
      "----------------------------",
      `Name: ${data.get("name") || ""}`,
      `Phone: ${data.get("phone") || ""}`,
      `City: ${data.get("city") || ""}`,
      `Test type: ${data.get("test_type") || ""}`,
      `Truck year: ${data.get("truck_year") || ""}`,
      `Truck count: ${data.get("truck_count") || ""}`,
      `Notes: ${data.get("notes") || ""}`,
      "Track: Desktop/LEAD-SCRUB/INBOUND/INBOUND-LEADS.csv",
    ];
    const body = encodeURIComponent(lines.join("\n"));
    const subject = encodeURIComponent(
      "[LEAD][smoke_sd] " +
        (data.get("name") || "test request") +
        " · OBD $119 · OVI $219"
    );    // Fire mail client in background; always land on thank-you with generic OBD/OVI links
    const mail = `mailto:admin@mobilecarbsmoketest.com?subject=${subject}&body=${body}`;
    try {
      const a = document.createElement("a");
      a.href = mail;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (_) {
      /* ignore */
    }
    window.location.href = "/thank-you/";
  });
})();
