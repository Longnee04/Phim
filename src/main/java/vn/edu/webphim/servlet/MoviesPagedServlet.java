package vn.edu.webphim.servlet;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@WebServlet(name = "MoviesPagedServlet", urlPatterns = {"/moviesPaged"})
public class MoviesPagedServlet extends HttpServlet {

    private final Gson gson = new Gson();
    private final HttpClient httpClient = HttpClient.newBuilder().build();

    private static final String BASE_IMG = "https://img.ophim.live/uploads/movies/";

    private static String endpointForType(String type) {
        if (type == null) return null;
        type = type.toLowerCase(Locale.ROOT);
        switch (type) {
            case "new":
                return "https://ophim1.com/danh-sach/phim-moi-cap-nhat?page=1"; // không có page ở v1 api, dùng nguồn có sẵn theo code cũ
            case "series":
                return "https://ophim1.com/v1/api/danh-sach/phim-bo";
            case "movies":
                return "https://ophim1.com/v1/api/danh-sach/phim-le";
            case "cartoon":
                return "https://ophim1.com/v1/api/danh-sach/hoat-hinh";
            default:
                return null;
        }
    }

    private static JsonArray extractItems(JsonObject root, String type) {
        // API new: { items: [...] }
        // API v1: { data: { items: [...] } }
        if (root == null) return new JsonArray();

        if ("new".equalsIgnoreCase(type)) {
            JsonElement items = root.get("items");
            if (items != null && items.isJsonArray()) return items.getAsJsonArray();
            return new JsonArray();
        }

        JsonElement dataEl = root.get("data");
        if (dataEl != null && dataEl.isJsonObject()) {
            JsonObject dataObj = dataEl.getAsJsonObject();
            JsonElement items = dataObj.get("items");
            if (items != null && items.isJsonArray()) return items.getAsJsonArray();
        }
        return new JsonArray();
    }

    private String fetchJson(String url) throws IOException, InterruptedException {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(java.time.Duration.ofSeconds(20))
                .GET()
                .header("Accept", "application/json,text/plain,*/*")
                .build();

        HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
            throw new IOException("Upstream fetch failed, status=" + resp.statusCode());
        }
        return resp.body();
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        response.setContentType("application/json;charset=UTF-8");
        response.setHeader("Access-Control-Allow-Origin", "*");

        String type = request.getParameter("type");
        String pageStr = request.getParameter("page");
        String pageSizeStr = request.getParameter("pageSize");

        int page = parseIntSafe(pageStr, 1);
        int pageSize = parseIntSafe(pageSizeStr, 24);
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 24;

        String endpoint = endpointForType(type);
        if (endpoint == null) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            response.getWriter().write(gson.toJson(new JsonObject()));
            return;
        }

        try {
            String body = fetchJson(endpoint);
            JsonObject root = JsonParser.parseString(body).getAsJsonObject();

            JsonArray items = extractItems(root, type);
            int totalItems = items.size();
            int totalPages = (int) Math.ceil(totalItems / (double) pageSize);

            int fromIndex = (page - 1) * pageSize;
            int toIndexExclusive = Math.min(fromIndex + pageSize, totalItems);

            JsonArray pageItems = new JsonArray();
            if (fromIndex >= 0 && fromIndex < totalItems) {
                for (int i = fromIndex; i < toIndexExclusive; i++) {
                    JsonElement el = items.get(i);
                    pageItems.add(el);
                }
            }

            // Chuẩn hoá lại một số field hay dùng ở frontend
            JsonArray normalized = new JsonArray();
            for (JsonElement el : pageItems) {
                if (!el.isJsonObject()) continue;
                JsonObject m = el.getAsJsonObject();

                // đảm bảo có poster_url / thumb_url / slug / name
                // API v1: thumb_url, poster_url, slug, name
                // API new: poster_url, thumb_url, slug, name

                // Chỉ để frontend render tốt, không ép schema quá chặt
                normalized.add(m);
            }

            JsonObject out = new JsonObject();
            out.addProperty("page", page);
            out.addProperty("pageSize", pageSize);
            out.addProperty("totalItems", totalItems);
            out.addProperty("totalPages", totalPages);
            out.add("items", normalized);

            // Có thể dùng cho UI filter nếu muốn nâng cấp sau
            out.addProperty("baseImg", BASE_IMG);

            response.getWriter().write(out.toString());
        } catch (Exception ex) {
            response.setStatus(HttpServletResponse.SC_BAD_GATEWAY);
            JsonObject err = new JsonObject();
            err.addProperty("error", "Failed to fetch movies");
            err.addProperty("detail", ex.getMessage());
            response.getWriter().write(err.toString());
        }
    }

    private static int parseIntSafe(String s, int def) {
        try {
            if (s == null) return def;
            return Integer.parseInt(s);
        } catch (Exception e) {
            return def;
        }
    }
}

