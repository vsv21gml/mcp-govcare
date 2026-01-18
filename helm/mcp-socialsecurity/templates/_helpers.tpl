{{- define "mcp-socialsecurity.name" -}}
mcp-socialsecurity
{{- end -}}

{{- define "mcp-socialsecurity.fullname" -}}
{{ include "mcp-socialsecurity.name" . }}
{{- end -}}
