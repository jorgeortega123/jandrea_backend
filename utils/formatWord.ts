 export const formatWords = (text?: string) => {
      // Proporciona un valor por defecto de cadena vacía si 'text' es 'undefined'
      const safeText = text ?? "";

      // Reemplaza los espacios por guiones y convierte a minúsculas
      const res = safeText.replace(/ /g, "-").toLowerCase();

      // Normaliza el texto para eliminar los acentos y diacríticos
      return res.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };
