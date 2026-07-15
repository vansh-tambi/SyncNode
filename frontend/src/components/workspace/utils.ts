export const getMethodBadgeClass = (method: string) => {
  switch (method.toUpperCase()) {
    case "GET": return "bg-method-get/10 text-method-get border-method-get/20";
    case "POST": return "bg-method-post/10 text-method-post border-method-post/20";
    case "DELETE": return "bg-method-delete/10 text-method-delete border-method-delete/20";
    default: return "bg-secondary text-muted-foreground border-border";
  }
};

export const getStatusCodeClass = (status: number) => {
  if (status >= 200 && status < 300) return "bg-method-get/10 text-method-get border-method-get/20";
  if (status >= 400) return "bg-method-delete/10 text-method-delete border-method-delete/20";
  return "bg-secondary text-muted-foreground border-border";
};
