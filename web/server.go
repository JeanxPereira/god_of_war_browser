package web

import (
	"log"
	"net/http"
	"os"
	"path"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"

	"github.com/mogaika/god_of_war_browser/vfs"
	"github.com/mogaika/god_of_war_browser/web/apiv2"
)

var ServerDirectory vfs.Directory
var DriverDirectory vfs.Directory
var wsUpgrader = websocket.Upgrader{}

func StartServer(addr string, packsDir vfs.Directory, driver vfs.Directory, webPath string) error {
	ServerDirectory = packsDir
	DriverDirectory = driver

	r := mux.NewRouter()
	// CORS global para UI (Next.js ou legacy). handlers.CORS não estava garantindo header em alguns códigos de erro,
	// então aplicamos manualmente e curtamos OPTIONS.
	corsMiddleware := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusOK)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
	r.Use(corsMiddleware)

	// =============================================================================
	// API V2 - Nova API REST para Next.js UI
	// =============================================================================
	apiV2Router := r.PathPrefix("/api/v2").Subrouter()
	apiV2Router.Use(apiv2.CORSMiddleware)

	// Filesystem
	apiV2Router.HandleFunc("/filesystem", apiv2.HandleListFileSystem(packsDir)).Methods("GET", "OPTIONS")
	
	// Pack contents
	apiV2Router.HandleFunc("/pack/{file}/contents", apiv2.HandleGetPackContents(packsDir)).Methods("GET", "OPTIONS")
	
	// Resource info
	apiV2Router.HandleFunc("/pack/{file}/resource/{id}", apiv2.HandleGetResourceInfo(packsDir)).Methods("GET", "OPTIONS")
	
	// Mesh data for 3D rendering
	apiV2Router.HandleFunc("/pack/{file}/mesh/{id}", apiv2.HandleGetMeshData(packsDir)).Methods("GET", "OPTIONS")

	log.Printf("[web] API v2 endpoints registered at /api/v2")

	// =============================================================================
	// Legacy routes - UI antiga continua funcionando
	// =============================================================================
	r.HandleFunc("/action/{file}/{param}/{action}", HandlerActionPackFileParam)
	r.HandleFunc("/json/pack/{file}/{param}", HandlerAjaxPackFileParam)
	r.HandleFunc("/json/pack/{file}", HandlerAjaxPackFile)
	r.HandleFunc("/json/pack", HandlerAjaxPack)
	r.HandleFunc("/json/fs", HandlerAjaxFs)
	r.HandleFunc("/dump/pack/{file}/{param}", HandlerDumpPackParamFile)
	r.HandleFunc("/dump/pack/{file}", HandlerDumpPackFile)
	r.HandleFunc("/dump/fs/{file}", HandlerDumpFsFile)
	r.HandleFunc("/delete/pack/{file}", HandlerDeletePackFile)
	r.HandleFunc("/upload/pack/{file}", HandlerUploadPackFile)
	r.HandleFunc("/upload/pack/{file}/{param}", HandlerUploadPackFileParam)
	r.HandleFunc("/ws/status", HandlerWebsocketStatus)

	r.PathPrefix("/").Handler(http.FileServer(http.Dir(path.Join(webPath, "data"))))

	h := handlers.RecoveryHandler(handlers.PrintRecoveryStack(true))(r)
	h = handlers.LoggingHandler(os.Stdout, h)
	h = corsMiddleware(h)

	log.Printf("[web] Starting server %v", addr)
	log.Printf("[web] Old UI: http://localhost%s", addr)
	log.Printf("[web] New UI: http://localhost:3000 (run: cd webui && pnpm dev)")

	return http.ListenAndServe(addr, h)
}
