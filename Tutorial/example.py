import random

def number_randomizer():
    """
    Simple number randomizer game.
    Choose a range and get a random number from that range.
    """
    print("=" * 50)
    print("Welcome to the Number Randomizer Game!")
    print("=" * 50)
    
    while True:
        try:
            # Get the minimum number
            min_num = int(input("\nEnter the minimum number: "))
            
            # Get the maximum number
            max_num = int(input("Enter the maximum number: "))
            
            # Validate the range
            if min_num > max_num:
                print("Error: Minimum number cannot be greater than maximum number!")
                continue
            
            # Generate random number
            random_number = random.randint(min_num, max_num)
            
            print(f"\n🎲 Random number from range [{min_num}, {max_num}]: {random_number}")
            
            # Ask if user wants to continue
            play_again = input("\nDo you want to generate another number? (yes/no): ").lower().strip()
            if play_again not in ['yes', 'y']:
                print("\nThanks for playing! Goodbye!")
                break
                
        except ValueError:
            print("Error: Please enter valid integers!")
        except KeyboardInterrupt:
            print("\n\nGame interrupted. Goodbye!")
            break
        except Exception as e:
            print(f"An error occurred: {e}")

if __name__ == "__main__":
    number_randomizer()

