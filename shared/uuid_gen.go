package shared

import (
	"log"
	"runtime"

	"github.com/gofrs/uuid"
)

func ParseUUID(id uuid.UUID) (UUID string) {
	UUID = id.String()
	return UUID
}

func GenerateUUID() uuid.UUID {
	id, err := uuid.NewV4()
	if err != nil {
		_, line, file, _ := runtime.Caller(0)
		log.Println("ERROR: can't generate uuid"+" "+line, file)
	}
	return id
}
