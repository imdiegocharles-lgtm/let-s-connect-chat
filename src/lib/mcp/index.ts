import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMenuItems from "./tools/list-menu-items";
import setItemAvailability from "./tools/set-item-availability";
import listOrders from "./tools/list-orders";
import listReservations from "./tools/list-reservations";
import updateReservationStatus from "./tools/update-reservation-status";
import listReviews from "./tools/list-reviews";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "familia-amaral-churrasquinho-restaurante",
  title: "Família Amaral Churrasquinho & Restaurante",
  version: "0.1.0",
  instructions:
    "Ferramentas do sistema de delivery e reservas do restaurante Família Amaral. Permitem consultar pedidos, cardápio, reservas e avaliações, alterar a disponibilidade de itens e atualizar o status de reservas. Todas as ações são executadas com a conta do usuário autenticado.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listMenuItems,
    setItemAvailability,
    listOrders,
    listReservations,
    updateReservationStatus,
    listReviews,
  ],
});