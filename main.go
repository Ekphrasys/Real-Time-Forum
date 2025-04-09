package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	"Real-Time-Forum/database"
	"Real-Time-Forum/server"
)

// "github.com/gorilla/websocket"

// var upgrader = websocket.Upgrader{
// 	ReadBufferSize:  1024,
// 	WriteBufferSize: 1024,
// 	CheckOrigin: func(r *http.Request) bool {
// 		// Allow all connections by default
// 		return true
// 	},
// }

// func handleWebsocket(w http.ResponseWriter, r *http.Request) {
// 	// Upgrade the HTTP connection to a websocket connection
// 	conn, err := upgrader.Upgrade(w, r, nil)
// 	if err != nil {
// 		fmt.Println(err)
// 		return
// 	}
// 	defer conn.Close()

// 	// Websocket messages handler
// 	for {
// 		messageType, data, err := conn.ReadMessage()
// 		if err != nil {
// 			fmt.Println(err)
// 			return
// 		}
// 		fmt.Println(string(data))
// 		// Send message to the client
// 		if err := conn.WriteMessage(messageType, data); err != nil {
// 			fmt.Println(err)
// 			return
// 		}
// 	}
// }

// func main() {
// 	http.HandleFunc("/ws", handleWebsocket)

// 	// Serve index.html and other static files
// 	http.Handle("/", http.FileServer(http.Dir("./")))

// 	fmt.Println("Server started at http://localhost:8080")
// 	if err := http.ListenAndServe(":8080", nil); err != nil {
// 		log.Fatal("ListenAndServe: ", err)
// 	}
// }

func gracefulShutdown(apiServer *http.Server) {
	// Create a context that listens for interrupt signals (SIGINT, SIGTERM) from the OS.
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop() // Ensure the signal notification is stopped when the function exits.

	// Wait for the interrupt signal.
	<-ctx.Done()

	log.Println("shutting down gracefully, press Ctrl+C again to force")

	// Create a new context with a timeout of 5 seconds to allow the server to finish ongoing requests.
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel() // Ensure the timeout context is canceled when the function exits.

	// Attempt to gracefully shut down the server.
	if err := apiServer.Shutdown(ctx); err != nil {
		log.Printf("Server forced to shutdown with error: %v", err)
	}

	log.Println("Server exiting")
}

func main() {
	database.InitDB()
	defer database.DB.Close()

	mux := http.NewServeMux()
	server.SetupRoutes(mux)

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, "Go server + SQLite operational!")
	})

	// Serve static files
	mux.Handle("/", http.FileServer(http.Dir("./static")))

	// Create a new HTTP server instance.
	server := &http.Server{
		Addr:    ":8080", // Set the server address and port.
		Handler: mux,     // Set the request handler to the default multiplexer.
	}

	// Start the graceful shutdown process in a separate goroutine.
	go gracefulShutdown(server)

	fmt.Println("Server started on port", server.Addr)
	// Start the HTTP server and listen for incoming requests.
	err := server.ListenAndServe()
	if err != nil && err != http.ErrServerClosed {
		// If the server encounters an error other than a graceful shutdown, panic and log the error.
		panic(fmt.Sprintf("http server error: %s", err))
	}
}
