function renderTemplate(template, values, label = "template") {
  let output = template;
  Object.entries(values).forEach(([name, value]) => {
    const token = `{{${name}}}`;
    if (!output.includes(token)) {
      throw new Error(`${label} is missing required token ${token}`);
    }
    output = output.split(token).join(String(value));
  });
  const unresolved = Array.from(
    output.matchAll(/\{\{[A-Z0-9_]+\}\}/g),
    (match) => match[0],
  );
  if (unresolved.length) {
    throw new Error(
      `${label} contains unresolved tokens: ${Array.from(new Set(unresolved)).join(", ")}`,
    );
  }
  return output;
}

module.exports = { renderTemplate };
