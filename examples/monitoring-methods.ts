import { monitor } from "../src/index.ts";

class UserService {
    private static prefix = "User: ";
    private permission = "user";
    
    public printName = (name:string)=> {
        console.log(UserService.prefix, name);
        console.log('Permission: ',this.permission);
    }
}

const service = new UserService();

const monitoredPrint = monitor({
    main: {
        ref:service.printName,
        bind:service,
        captures:{
            UserService// You can capture the class directly for class methods or properties
        }
    },
    inspector: (visit) => {
        visit.is('CallExpression', ()=> {
            console.log("\nA function was called");
        });
    }
});
monitoredPrint("Alice"); // "this" is correctly preserved!

/**
 * Output
 * ------
 * A function was called
 * User:  Alice
 *
 * A function was called
 * Permission:  user
*/