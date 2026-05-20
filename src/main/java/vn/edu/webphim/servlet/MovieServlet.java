package vn.edu.webphim.servlet;

import com.google.gson.Gson;
import vn.edu.webphim.data.MockData;
import vn.edu.webphim.model.Movie;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.List;

// Map Servlet này với đường dẫn /movies
@WebServlet(name = "MovieServlet", urlPatterns = {"/movies"})
public class MovieServlet extends HttpServlet {

    private final Gson gson = new Gson();

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) 
            throws ServletException, IOException {
        
        // Thiết lập header trả về là JSON và hỗ trợ tiếng Việt (UTF-8)
        response.setContentType("application/json;charset=UTF-8");
        // Cho phép gọi API từ frontend nếu cần (CORS)
        response.setHeader("Access-Control-Allow-Origin", "*");

        try (PrintWriter out = response.getWriter()) {
            String idParam = request.getParameter("id");

            // Trường hợp 1: Không có ID -> Trả về danh sách tất cả phim
            if (idParam == null || idParam.trim().isEmpty()) {
                List<Movie> allMovies = MockData.getAllMovies();
                String jsonResponse = gson.toJson(allMovies);
                out.print(jsonResponse);
            } 
            // Trường hợp 2: Có ID -> Trả về chi tiết bộ phim đó
            else {
                try {
                    int id = Integer.parseInt(idParam);
                    Movie movie = MockData.getMovieById(id);
                    
                    if (movie != null) {
                        String jsonResponse = gson.toJson(movie);
                        out.print(jsonResponse);
                    } else {
                        response.setStatus(HttpServletResponse.SC_NOT_FOUND);
                        out.print("{\"error\": \"Không tìm thấy bộ phim với ID " + id + "\"}");
                    }
                } catch (NumberFormatException e) {
                    response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                    out.print("{\"error\": \"ID phim không hợp lệ\"}");
                }
            }
            out.flush();
        }
    }
}
