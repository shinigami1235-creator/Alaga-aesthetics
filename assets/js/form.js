/*
  Builds the clinic financing intake form inside any element with
  data-register-form.
  Load after content.js and before site.js.
*/
(function () {
  const fields = [
    { name: "name", type: "text", required: true, auto: "name" },
    { name: "email", type: "email", required: true, auto: "email" },
    { name: "phone", type: "tel", auto: "tel" },
    { name: "big", type: "text", inputmode: "numeric", hint: true },
    { group: "role", kind: "radio", options: 3, wide: true },
    { group: "plan", kind: "checkbox", options: 4, wide: true },
    { name: "city", type: "text", hint: true, auto: "address-level2" },
    { name: "when", type: "text", hint: true },
    { name: "budget", type: "text", hint: true, wide: true },
    { name: "notes", type: "textarea", wide: true }
  ];

  function field(f) {
    const id = "reg-" + f.name;
    const hintId = id + "-hint";
    const attrs = [
      `id="${id}"`, `name="${f.name}"`, `type="${f.type}"`, `data-label="form.${f.name}"`,
      f.required ? "required" : "",
      f.auto ? `autocomplete="${f.auto}"` : "",
      f.inputmode ? `inputmode="${f.inputmode}"` : "",
      f.min !== undefined ? `min="${f.min}"` : "",
      f.max !== undefined ? `max="${f.max}"` : "",
      f.hint ? `aria-describedby="${hintId}"` : ""
    ].filter(Boolean).join(" ");
    return `<div class="reg-field${f.wide ? " reg-wide" : ""}" data-field>
      <label for="${id}"><span data-t="form.${f.name}"></span>${f.required ? '<span class="reg-req" aria-hidden="true">*</span>' : ""}</label>
      ${f.hint ? `<p class="reg-hint" id="${hintId}" data-t="form.${f.name}.hint"></p>` : ""}
      ${f.type === "textarea" ? `<textarea ${attrs.replace(/type="textarea" /, "")} rows="4"></textarea>` : `<input ${attrs}>`}
    </div>`;
  }

  function group(g) {
    const opts = Array.from({ length: g.options }, (_, i) => {
      const n = i + 1;
      return `<label class="reg-option"><input type="${g.kind}" name="${g.group}" value="${n}" data-option="form.${g.group}.${n}"${g.kind === "radio" && n === 1 ? " checked" : ""}><span data-t="form.${g.group}.${n}"></span></label>`;
    }).join("");
    return `<fieldset class="reg-group${g.wide ? " reg-wide" : ""}"><legend data-t="form.${g.group}"></legend><div class="reg-options">${opts}</div></fieldset>`;
  }

  function build(host) {
    const privacyHref = host.dataset.privacy || "../privacy/";
    host.innerHTML = `<form class="reg" data-register novalidate>
      <div class="reg-grid">
        ${fields.map((f) => (f.group ? group(f) : field(f))).join("")}
        <div class="reg-consent reg-wide" data-field>
          <label class="reg-option"><input type="checkbox" id="reg-consent" name="consent" required data-label="form.consent"><span data-t="form.consent"></span></label>
          <a class="reg-privacy" href="${privacyHref}" data-keep-lang data-t="form.privacy"></a>
        </div>
        <div class="reg-actions reg-wide">
          <button type="submit" class="reg-submit" data-t="form.submit"></button>
          <p class="reg-status" data-form-status role="status" hidden></p>
        </div>
      </div>
    </form>`;
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-register-form]").forEach(build);
  });
})();
