function renderRuntime(source, values) {
  let output = source;
  Object.entries(values).forEach(([name, value]) => {
    const token = `__BUILD_${name}__`;
    if (!output.includes(token)) {
      throw new Error(`application runtime is missing required token ${token}`);
    }
    output = output.split(token).join(String(value));
  });
  const unresolved = Array.from(
    output.matchAll(/__BUILD_[A-Z0-9_]+__/g),
    (match) => match[0],
  );
  if (unresolved.length) {
    throw new Error(
      `application runtime contains unresolved tokens: ${Array.from(new Set(unresolved)).join(", ")}`,
    );
  }
  return output;
}

module.exports = { renderRuntime };
