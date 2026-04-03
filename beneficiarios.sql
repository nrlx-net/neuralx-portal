CREATE TABLE beneficiarios (
  id_beneficiario  NVARCHAR(50)  NOT NULL PRIMARY KEY,
  id_usuario       NVARCHAR(50)  NOT NULL
                   REFERENCES usuarios_socios(id_usuario),
  tipo             NVARCHAR(20)  NOT NULL DEFAULT N'particular',
  nombre           NVARCHAR(200) NOT NULL,
  apellidos        NVARCHAR(200) NULL,
  email            NVARCHAR(254) NULL,
  pais             NVARCHAR(100) NOT NULL DEFAULT N'México',
  divisa           NVARCHAR(10)  NOT NULL DEFAULT N'MXN',
  clabe            NVARCHAR(30)  NULL,
  iban             NVARCHAR(40)  NULL,
  swift            NVARCHAR(20)  NULL,
  banco            NVARCHAR(200) NULL,
  numero_cuenta    NVARCHAR(100) NULL,
  estatus          NVARCHAR(20)  NOT NULL DEFAULT N'activo',
  created_at       DATETIME2(0)  NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_benef_usuario ON beneficiarios(id_usuario);
